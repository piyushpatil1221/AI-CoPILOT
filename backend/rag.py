"""
rag.py — LangChain-based RAG pipeline with conversation memory.
Supports streaming via async generators and returns citations.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import AsyncGenerator, Optional

from config import LLMProvider, settings
from models import Citation, StreamChunk
from vectorstore import vector_store

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------

def _build_llm(provider: Optional[LLMProvider] = None, temperature: float = 0.5, streaming: bool = False):
    """Build the appropriate LangChain LLM object."""
    provider = provider or settings.llm_provider

    if provider == LLMProvider.GEMINI:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=settings.gemini_model,
                google_api_key=settings.gemini_api_key,
                temperature=temperature,
                streaming=streaming,
                convert_system_message_to_human=True,
            )
        except ImportError as e:
            logger.error("langchain-google-genai not installed: %s", e)
            raise

    # OpenAI
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=settings.openai_model,
        openai_api_key=settings.openai_api_key,
        temperature=temperature,
        streaming=streaming,
    )


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are an expert AI financial analyst and due diligence assistant.
You have access to excerpts from financial documents (annual reports, investor presentations, financial statements, market research).

Your job is to answer questions accurately, citing the specific sources provided.
Be precise, professional, and concise. If the answer is not in the provided context, say so clearly.

Always structure your answers clearly. Use bullet points where appropriate.
At the end of your answer, summarise the key citations used."""

_RAG_PROMPT_TEMPLATE = """{system}

--- DOCUMENT CONTEXT ---
{context}
--- END CONTEXT ---

Conversation History:
{history}

User Question: {question}

Answer (be thorough but concise, cite sources as [Source: filename, Page X]):"""


# ---------------------------------------------------------------------------
# Conversation memory store (in-process, keyed by session_id)
# ---------------------------------------------------------------------------

class ConversationMemory:
    """Simple in-process conversation history (list of dicts)."""

    def __init__(self, max_turns: int = None):
        self._max = max_turns or settings.max_conversation_history
        self._store: dict[str, list[dict]] = defaultdict(list)

    def add(self, session_id: str, role: str, content: str) -> None:
        history = self._store[session_id]
        history.append({"role": role, "content": content})
        if len(history) > self._max * 2:
            self._store[session_id] = history[-(self._max * 2):]

    def get_formatted(self, session_id: str) -> str:
        history = self._store.get(session_id, [])
        if not history:
            return "None"
        lines = []
        for msg in history:
            role = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role}: {msg['content'][:300]}")
        return "\n".join(lines)

    def clear(self, session_id: str) -> None:
        self._store.pop(session_id, None)


memory_store = ConversationMemory()


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------

def _build_context(chunks: list[dict]) -> str:
    """Format retrieved chunks into a context string."""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(
            f"[{i}] Source: {chunk['source']}, Page {chunk['page']}\n"
            f"{chunk['text']}\n"
        )
    return "\n---\n".join(parts)


def _compute_confidence(chunks: list[dict]) -> float:
    """Average similarity score → confidence percentage."""
    if not chunks:
        return 0.0
    avg = sum(c["score"] for c in chunks) / len(chunks)
    return round(avg, 4)


def _chunks_to_citations(chunks: list[dict]) -> list[Citation]:
    seen: set[str] = set()
    citations: list[Citation] = []
    for chunk in chunks:
        key = f"{chunk['source']}::{chunk['page']}"
        if key not in seen:
            seen.add(key)
            citations.append(
                Citation(
                    source=chunk["source"],
                    page=chunk["page"],
                    chunk_index=chunk["chunk_index"],
                    text_snippet=chunk["text"][:200],
                    score=chunk["score"],
                )
            )
    return citations


# ---------------------------------------------------------------------------
# Streaming RAG
# ---------------------------------------------------------------------------

async def stream_rag_answer(
    session_id: str,
    question: str,
    provider: Optional[LLMProvider] = None,
) -> AsyncGenerator[str, None]:
    """
    Async generator that yields SSE-formatted JSON strings:
      {"type": "token", "content": "..."}
      {"type": "citation", "content": [...]}
      {"type": "done", "content": {"confidence": 0.87}}
      {"type": "error", "content": "message"}
    """
    try:
        # 1. Retrieve relevant chunks
        chunks = vector_store.query_raw(session_id, question)
        if not chunks:
            yield _sse(StreamChunk(type="error", content="No relevant documents found for this session."))
            return

        # 2. Build prompt
        context = _build_context(chunks)
        history = memory_store.get_formatted(session_id)
        prompt = _RAG_PROMPT_TEMPLATE.format(
            system=_SYSTEM_PROMPT,
            context=context,
            history=history,
            question=question,
        )

        # 3. Stream tokens from LLM
        provider = provider or settings.llm_provider
        llm = _build_llm(provider=provider, temperature=settings.chat_temperature, streaming=True)

        full_answer = ""
        async for chunk in llm.astream(prompt):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            full_answer += token
            yield _sse(StreamChunk(type="token", content=token))

        # 4. Send citations
        citations = _chunks_to_citations(chunks)
        yield _sse(StreamChunk(type="citation", content=[c.model_dump() for c in citations]))

        # 5. Confidence + done
        confidence = _compute_confidence(chunks)
        yield _sse(StreamChunk(type="done", content={"confidence": confidence}))

        # 6. Update memory
        memory_store.add(session_id, "user", question)
        memory_store.add(session_id, "assistant", full_answer[:600])

    except Exception as exc:
        logger.exception("RAG streaming error: %s", exc)
        yield _sse(StreamChunk(type="error", content=str(exc)))


async def get_rag_answer(
    session_id: str,
    question: str,
    provider: Optional[LLMProvider] = None,
) -> dict:
    """Non-streaming RAG — returns full answer dict."""
    chunks = vector_store.query_raw(session_id, question)
    if not chunks:
        return {"answer": "No relevant documents found.", "citations": [], "confidence": 0.0}

    context = _build_context(chunks)
    history = memory_store.get_formatted(session_id)
    prompt = _RAG_PROMPT_TEMPLATE.format(
        system=_SYSTEM_PROMPT,
        context=context,
        history=history,
        question=question,
    )

    provider = provider or settings.llm_provider
    llm = _build_llm(provider=provider, temperature=settings.chat_temperature)
    result = await llm.ainvoke(prompt)
    answer = result.content if hasattr(result, "content") else str(result)

    citations = _chunks_to_citations(chunks)
    confidence = _compute_confidence(chunks)

    memory_store.add(session_id, "user", question)
    memory_store.add(session_id, "assistant", answer[:600])

    return {
        "answer": answer,
        "citations": [c.model_dump() for c in citations],
        "confidence": confidence,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sse(chunk: StreamChunk) -> str:
    return f"data: {chunk.model_dump_json()}\n\n"
