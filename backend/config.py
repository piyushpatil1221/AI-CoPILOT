"""
config.py — Centralised settings for AI Due Diligence Copilot.
All values are read from environment variables (or .env file via python-dotenv).
"""

from __future__ import annotations

import logging
import os
from enum import Enum
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class LLMProvider(str, Enum):
    GEMINI = "gemini"
    OPENAI = "openai"


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── LLM ─────────────────────────────────────────────────────────────────
    llm_provider: LLMProvider = Field(
        default=LLMProvider.GEMINI,
        description="Primary LLM provider: 'gemini' or 'openai'",
    )
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    openai_api_key: str = Field(default="", description="OpenAI API key")

    # Gemini model names
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "models/gemini-embedding-2"

    # OpenAI model names (fallback)
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

    # ── Paths ────────────────────────────────────────────────────────────────
    base_dir: Path = Field(default_factory=lambda: Path(__file__).parent.parent)
    documents_dir: Path = Field(default=None)   # resolved in validator
    chroma_dir: Path = Field(default=None)       # resolved in validator

    @field_validator("documents_dir", mode="before")
    @classmethod
    def _resolve_docs(cls, v, info):
        if v:
            return Path(v)
        base = info.data.get("base_dir") or Path(__file__).parent.parent
        return Path(base) / "documents"

    @field_validator("chroma_dir", mode="before")
    @classmethod
    def _resolve_chroma(cls, v, info):
        if v:
            return Path(v)
        base = info.data.get("base_dir") or Path(__file__).parent.parent
        return Path(base) / "embeddings" / "chroma"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v):
        if isinstance(v, str):
            if v.strip().startswith("[") and v.strip().endswith("]"):
                try:
                    import json
                    return json.loads(v)
                except Exception:
                    pass
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    # ── RAG / retrieval ──────────────────────────────────────────────────────
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_top_k: int = 6
    max_conversation_history: int = 10

    # ── Server ───────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"
    cors_origins: list[str] | str = Field(
        default=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    )

    # ── Analysis ─────────────────────────────────────────────────────────────
    analysis_temperature: float = 0.3
    chat_temperature: float = 0.5

    def ensure_dirs(self) -> None:
        """Create required directories if they don't exist."""
        self.documents_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_dir.mkdir(parents=True, exist_ok=True)

    @property
    def active_llm_key(self) -> str:
        """Return the API key for the active provider."""
        if self.llm_provider == LLMProvider.GEMINI:
            return self.gemini_api_key
        return self.openai_api_key

    @property
    def active_model(self) -> str:
        if self.llm_provider == LLMProvider.GEMINI:
            return self.gemini_model
        return self.openai_model

    @property
    def active_embedding_model(self) -> str:
        if self.llm_provider == LLMProvider.GEMINI:
            return self.gemini_embedding_model
        return self.openai_embedding_model


# Singleton
settings = Settings()
settings.ensure_dirs()
