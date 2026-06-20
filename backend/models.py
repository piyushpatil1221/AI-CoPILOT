"""
models.py — Pydantic request / response schemas for the API.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared / enums
# ---------------------------------------------------------------------------

class LLMProviderEnum(str, Enum):
    GEMINI = "gemini"
    OPENAI = "openai"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

class SessionInfo(BaseModel):
    session_id: str
    name: str
    created_at: datetime
    document_count: int
    documents: list[str]


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    session_id: str
    filename: str
    page_count: int
    chunk_count: int
    message: str


class SessionCreateRequest(BaseModel):
    name: str = Field(default="New Session", max_length=120)


# ---------------------------------------------------------------------------
# Citation / source
# ---------------------------------------------------------------------------

class Citation(BaseModel):
    source: str          # filename
    page: int            # 1-indexed
    chunk_index: int
    text_snippet: str    # first 200 chars of the chunk
    score: float = Field(ge=0, le=1, description="Cosine similarity score")


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    session_id: str
    question: str = Field(min_length=1, max_length=2000)
    llm_provider: Optional[LLMProviderEnum] = None   # override per-request
    stream: bool = True


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    confidence: float = Field(ge=0, le=1)
    llm_provider: str
    model: str


# SSE event payload (serialised to JSON string inside the event)
class StreamChunk(BaseModel):
    type: str           # "token" | "citation" | "done" | "error"
    content: Any


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

class SwotItem(BaseModel):
    point: str
    source: Optional[Citation] = None


class SwotAnalysis(BaseModel):
    strengths: list[SwotItem]
    weaknesses: list[SwotItem]
    opportunities: list[SwotItem]
    threats: list[SwotItem]


class RiskFactor(BaseModel):
    title: str
    description: str
    level: RiskLevel
    citation: Optional[Citation] = None


class FinancialHighlight(BaseModel):
    metric: str
    value: str
    trend: str          # "up" | "down" | "neutral"
    note: Optional[str] = None


class AnalysisRequest(BaseModel):
    session_id: str
    llm_provider: Optional[LLMProviderEnum] = None
    sections: list[str] = Field(
        default=[
            "executive_summary",
            "business_model",
            "swot",
            "financial_highlights",
            "risk_factors",
            "growth_opportunities",
            "market_position",
            "investment_recommendation",
        ]
    )


class AnalysisReport(BaseModel):
    session_id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    llm_provider: str
    model: str
    overall_confidence: float = Field(ge=0, le=1)

    executive_summary: Optional[str] = None
    business_model: Optional[str] = None
    swot: Optional[SwotAnalysis] = None
    financial_highlights: Optional[list[FinancialHighlight]] = None
    risk_factors: Optional[list[RiskFactor]] = None
    growth_opportunities: Optional[list[str]] = None
    market_position: Optional[str] = None
    investment_recommendation: Optional[str] = None
    recommendation_score: Optional[float] = Field(default=None, ge=0, le=10)
    red_flags: Optional[list[str]] = None
    citations: list[Citation] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------

class CompareRequest(BaseModel):
    session_id_a: str
    session_id_b: str
    llm_provider: Optional[LLMProviderEnum] = None


class MetricComparison(BaseModel):
    metric: str
    company_a: str
    company_b: str
    winner: Optional[str] = None     # "a" | "b" | "tie"
    note: Optional[str] = None


class ComparisonReport(BaseModel):
    session_a_name: str
    session_b_name: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    metrics: list[MetricComparison]
    overall_comparison: str
    recommendation: str
    recommended_company: Optional[str] = None   # "a" | "b" | "tie"


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    llm_provider: str
    model: str
