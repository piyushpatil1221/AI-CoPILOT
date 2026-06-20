"""
vectorstore.py — ChromaDB persistent vector store wrapper.
Supports Gemini and OpenAI embeddings with a unified interface.
"""

from __future__ import annotations

import logging
from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from config import LLMProvider, settings
from models import Citation
from parser import ParsedChunk, ParsedDocument

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Embedding function factory
# ---------------------------------------------------------------------------

def _get_embedding_function():
    """Return a ChromaDB-compatible embedding function for the active provider."""
    if settings.llm_provider == LLMProvider.GEMINI:
        try:
            from chromadb.utils.embedding_functions import GoogleGenerativeAiEmbeddingFunction
            return GoogleGenerativeAiEmbeddingFunction(
                api_key=settings.gemini_api_key,
                model_name=settings.gemini_embedding_model,
            )
        except ImportError:
            logger.warning("Gemini embedding function not available, falling back to OpenAI")

    # OpenAI fallback
    from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
    return OpenAIEmbeddingFunction(
        api_key=settings.openai_api_key,
        model_name=settings.openai_embedding_model,
    )


# ---------------------------------------------------------------------------
# VectorStore
# ---------------------------------------------------------------------------

class VectorStore:
    """
    Persistent ChromaDB vector store.

    Each session gets its own collection named  "session_<session_id>".
    Documents are upserted with rich metadata (source, page, chunk_index …).
    """

    def __init__(self):
        self._client = chromadb.PersistentClient(
            path=str(settings.chroma_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._embedding_fn = _get_embedding_function()
        logger.info("ChromaDB initialised at %s", settings.chroma_dir)

    # ── Private helpers ────────────────────────────────────────────────────

    def _collection_name(self, session_id: str) -> str:
        # ChromaDB collection names must be 3-63 chars, alphanumeric + hyphens
        safe = session_id.replace("_", "-")[:50]
        return f"sess-{safe}"

    def _get_or_create_collection(self, session_id: str):
        name = self._collection_name(session_id)
        return self._client.get_or_create_collection(
            name=name,
            embedding_function=self._embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )

    # ── Public API ─────────────────────────────────────────────────────────

    def add_document(self, session_id: str, document: ParsedDocument) -> int:
        """Embed and store all chunks from a parsed document. Returns chunk count."""
        collection = self._get_or_create_collection(session_id)

        # Build batch lists
        ids: list[str] = []
        texts: list[str] = []
        metadatas: list[dict] = []

        for chunk in document.chunks:
            uid = f"{session_id}::{chunk.source}::p{chunk.page}::c{chunk.chunk_index}"
            ids.append(uid)
            texts.append(chunk.text)
            metadatas.append(chunk.to_metadata())

        # ChromaDB recommends batches ≤ 5000
        BATCH = 500
        for i in range(0, len(ids), BATCH):
            collection.upsert(
                ids=ids[i : i + BATCH],
                documents=texts[i : i + BATCH],
                metadatas=metadatas[i : i + BATCH],
            )

        logger.info(
            "Stored %d chunks for doc '%s' in session '%s'",
            len(ids), document.filename, session_id,
        )
        return len(ids)

    def query(
        self,
        session_id: str,
        query_text: str,
        top_k: int = None,
        where: Optional[dict] = None,
    ) -> list[Citation]:
        """
        Retrieve the top-K most relevant chunks and return as Citation objects.
        """
        top_k = top_k or settings.retrieval_top_k
        collection = self._get_or_create_collection(session_id)

        if collection.count() == 0:
            logger.warning("Collection for session '%s' is empty", session_id)
            return []

        try:
            results = collection.query(
                query_texts=[query_text],
                n_results=min(top_k, collection.count()),
                where=where,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            logger.error("ChromaDB query error: %s", exc)
            return []

        citations: list[Citation] = []
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        distances = results["distances"][0]

        for doc, meta, dist in zip(docs, metas, distances):
            # ChromaDB cosine distance → similarity score
            score = max(0.0, 1.0 - dist)
            citations.append(
                Citation(
                    source=meta.get("source", "unknown"),
                    page=int(meta.get("page", 0)),
                    chunk_index=int(meta.get("chunk_index", 0)),
                    text_snippet=doc[:200],
                    score=round(score, 4),
                )
            )

        return citations

    def query_raw(self, session_id: str, query_text: str, top_k: int = None) -> list[dict]:
        """Same as query() but returns raw dicts with full text (for RAG context)."""
        top_k = top_k or settings.retrieval_top_k
        collection = self._get_or_create_collection(session_id)

        if collection.count() == 0:
            return []

        try:
            results = collection.query(
                query_texts=[query_text],
                n_results=min(top_k, collection.count()),
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            logger.error("ChromaDB query_raw error: %s", exc)
            return []

        items = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            items.append(
                {
                    "text": doc,
                    "source": meta.get("source", "unknown"),
                    "page": int(meta.get("page", 0)),
                    "chunk_index": int(meta.get("chunk_index", 0)),
                    "score": max(0.0, 1.0 - dist),
                }
            )
        return items

    def list_sessions(self) -> list[str]:
        """Return all session IDs stored in ChromaDB."""
        collections = self._client.list_collections()
        session_ids = []
        for col in collections:
            name = col.name
            if name.startswith("sess-"):
                session_ids.append(name[5:].replace("-", "_"))
        return session_ids

    def delete_session(self, session_id: str) -> bool:
        """Delete a session's collection."""
        name = self._collection_name(session_id)
        try:
            self._client.delete_collection(name)
            return True
        except Exception:
            return False

    def session_has_data(self, session_id: str) -> bool:
        name = self._collection_name(session_id)
        try:
            col = self._client.get_collection(name, embedding_function=self._embedding_fn)
            return col.count() > 0
        except Exception:
            return False

    def rebuild_embedding_function(self, provider: LLMProvider) -> None:
        """Hot-swap the embedding function when the user switches provider."""
        old_provider = settings.llm_provider
        settings.llm_provider = provider
        self._embedding_fn = _get_embedding_function()
        logger.info("Embedding function switched from %s to %s", old_provider, provider)


# Singleton
vector_store = VectorStore()
