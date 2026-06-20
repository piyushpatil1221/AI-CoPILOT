"""
main.py — FastAPI application: routers, middleware, startup, SSE endpoints.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from analyzer import generate_comparison, generate_full_analysis
from config import LLMProvider, settings
from models import (
    AnalysisRequest,
    ChatRequest,
    CompareRequest,
    HealthResponse,
    LLMProviderEnum,
    SessionCreateRequest,
    SessionInfo,
    UploadResponse,
)
from parser import pdf_parser
from rag import memory_store, stream_rag_answer, get_rag_answer
from vectorstore import vector_store

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Session metadata store (in-memory + JSON file for persistence)
# ---------------------------------------------------------------------------

_SESSION_FILE = settings.chroma_dir / "sessions.json"

def _load_sessions() -> dict[str, dict]:
    if _SESSION_FILE.exists():
        try:
            return json.loads(_SESSION_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def _save_sessions(sessions: dict[str, dict]) -> None:
    _SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    _SESSION_FILE.write_text(json.dumps(sessions, default=str, indent=2), encoding="utf-8")

_sessions: dict[str, dict] = _load_sessions()

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Due Diligence Copilot",
    description="Production-quality AI for investment due diligence on financial documents.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health():
    return HealthResponse(
        llm_provider=settings.llm_provider.value,
        model=settings.active_model,
    )


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

@app.get("/api/sessions", tags=["Sessions"])
async def list_sessions() -> list[SessionInfo]:
    result = []
    for sid, meta in _sessions.items():
        result.append(SessionInfo(
            session_id=sid,
            name=meta.get("name", "Unnamed"),
            created_at=datetime.fromisoformat(meta["created_at"]),
            document_count=len(meta.get("documents", [])),
            documents=meta.get("documents", []),
        ))
    return sorted(result, key=lambda s: s.created_at, reverse=True)


@app.post("/api/sessions", tags=["Sessions"])
async def create_session(req: SessionCreateRequest) -> dict:
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "name": req.name,
        "created_at": datetime.utcnow().isoformat(),
        "documents": [],
    }
    _save_sessions(_sessions)
    return {"session_id": session_id, "name": req.name}


@app.delete("/api/sessions/{session_id}", tags=["Sessions"])
async def delete_session(session_id: str) -> dict:
    if session_id not in _sessions:
        raise HTTPException(404, "Session not found")
    vector_store.delete_session(session_id)
    memory_store.clear(session_id)
    _sessions.pop(session_id, None)
    _save_sessions(_sessions)
    return {"message": "Session deleted"}


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@app.post("/api/sessions/{session_id}/upload", response_model=UploadResponse, tags=["Documents"])
async def upload_document(
    session_id: str,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    if session_id not in _sessions:
        raise HTTPException(404, "Session not found. Create a session first.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    # Save to disk
    session_dir = settings.documents_dir / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    dest = session_dir / file.filename

    content = await file.read()
    dest.write_bytes(content)
    logger.info("Saved uploaded file: %s", dest)

    # Parse and embed
    try:
        doc = pdf_parser.parse(dest)
        chunk_count = vector_store.add_document(session_id, doc)
    except Exception as exc:
        dest.unlink(missing_ok=True)
        logger.exception("Parsing/embedding failed: %s", exc)
        raise HTTPException(500, f"Processing failed: {exc}")

    # Update session metadata
    if file.filename not in _sessions[session_id]["documents"]:
        _sessions[session_id]["documents"].append(file.filename)
    _save_sessions(_sessions)

    return UploadResponse(
        session_id=session_id,
        filename=file.filename,
        page_count=doc.page_count,
        chunk_count=chunk_count,
        message=f"Successfully processed '{file.filename}': {doc.page_count} pages, {chunk_count} chunks indexed.",
    )


# ---------------------------------------------------------------------------
# Chat  (streaming SSE)
# ---------------------------------------------------------------------------

@app.post("/api/chat", tags=["Chat"])
async def chat(req: ChatRequest):
    if req.session_id not in _sessions:
        raise HTTPException(404, "Session not found")

    if not vector_store.session_has_data(req.session_id):
        raise HTTPException(400, "No documents uploaded for this session yet.")

    provider: Optional[LLMProvider] = None
    if req.llm_provider:
        provider = LLMProvider(req.llm_provider.value)

    if req.stream:
        return StreamingResponse(
            stream_rag_answer(req.session_id, req.question, provider),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        result = await get_rag_answer(req.session_id, req.question, provider)
        return result


@app.delete("/api/chat/{session_id}/history", tags=["Chat"])
async def clear_chat_history(session_id: str) -> dict:
    memory_store.clear(session_id)
    return {"message": "Chat history cleared"}


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

@app.post("/api/analyze", tags=["Analysis"])
async def analyze(req: AnalysisRequest):
    if req.session_id not in _sessions:
        raise HTTPException(404, "Session not found")

    if not vector_store.session_has_data(req.session_id):
        raise HTTPException(400, "No documents uploaded for this session yet.")

    provider: Optional[LLMProvider] = None
    if req.llm_provider:
        provider = LLMProvider(req.llm_provider.value)

    try:
        report = await generate_full_analysis(
            session_id=req.session_id,
            provider=provider,
            sections=req.sections,
        )
        return report
    except Exception as exc:
        logger.exception("Analysis failed: %s", exc)
        raise HTTPException(500, f"Analysis failed: {exc}")


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------

@app.post("/api/compare", tags=["Comparison"])
async def compare(req: CompareRequest):
    for sid in [req.session_id_a, req.session_id_b]:
        if sid not in _sessions:
            raise HTTPException(404, f"Session '{sid}' not found")
        if not vector_store.session_has_data(sid):
            raise HTTPException(400, f"No documents in session '{sid}'")

    provider: Optional[LLMProvider] = None
    if req.llm_provider:
        provider = LLMProvider(req.llm_provider.value)

    name_a = _sessions[req.session_id_a].get("name", "Company A")
    name_b = _sessions[req.session_id_b].get("name", "Company B")

    try:
        report = await generate_comparison(
            session_id_a=req.session_id_a,
            session_id_b=req.session_id_b,
            name_a=name_a,
            name_b=name_b,
            provider=provider,
        )
        return report
    except Exception as exc:
        logger.exception("Comparison failed: %s", exc)
        raise HTTPException(500, f"Comparison failed: {exc}")


# ---------------------------------------------------------------------------
# LLM provider switch
# ---------------------------------------------------------------------------

@app.post("/api/settings/provider", tags=["System"])
async def switch_provider(provider: LLMProviderEnum) -> dict:
    settings.llm_provider = LLMProvider(provider.value)
    logger.info("LLM provider switched to %s", provider.value)
    return {
        "llm_provider": settings.llm_provider.value,
        "model": settings.active_model,
        "embedding_model": settings.active_embedding_model,
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower(),
    )
# reload trigger
