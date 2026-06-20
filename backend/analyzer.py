"""
analyzer.py — AI-powered structured analysis generator.
Produces Executive Summary, SWOT, Risk, Financials, Recommendation, etc.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

from config import LLMProvider, settings
from models import (
    AnalysisReport,
    Citation,
    ComparisonReport,
    FinancialHighlight,
    MetricComparison,
    RiskFactor,
    RiskLevel,
    SwotAnalysis,
    SwotItem,
)
from vectorstore import vector_store

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# LLM helpers (reuse from rag.py pattern)
# ---------------------------------------------------------------------------

def _build_llm(provider: Optional[LLMProvider] = None):
    provider = provider or settings.llm_provider
    if provider == LLMProvider.GEMINI:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            temperature=settings.analysis_temperature,
        )
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=settings.openai_model,
        openai_api_key=settings.openai_api_key,
        temperature=settings.analysis_temperature,
    )


async def _llm_json(llm, prompt: str) -> dict:
    """Call LLM and parse JSON response (with fallback)."""
    result = await llm.ainvoke(prompt)
    text = result.content if hasattr(result, "content") else str(result)
    # Strip markdown code fences if present
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[-1] if "```" in text[3:] else text
        text = text.replace("json", "", 1).strip().strip("`").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("LLM returned non-JSON, wrapping in raw: %s…", text[:100])
        return {"raw": text}


async def _llm_text(llm, prompt: str) -> str:
    result = await llm.ainvoke(prompt)
    return result.content if hasattr(result, "content") else str(result)


# ---------------------------------------------------------------------------
# Context retrieval helper
# ---------------------------------------------------------------------------

def _get_context(session_id: str, query: str, top_k: int = 8) -> tuple[str, list[Citation]]:
    chunks = vector_store.query_raw(session_id, query, top_k=top_k)
    citations: list[Citation] = []
    parts: list[str] = []
    seen: set[str] = set()

    for chunk in chunks:
        parts.append(
            f"[Source: {chunk['source']}, Page {chunk['page']}]\n{chunk['text']}"
        )
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
    return "\n\n---\n\n".join(parts), citations


# ---------------------------------------------------------------------------
# Individual section generators
# ---------------------------------------------------------------------------

async def gen_executive_summary(session_id: str, llm) -> tuple[str, list[Citation]]:
    context, cits = _get_context(session_id, "executive summary company overview business description")
    prompt = f"""Based on the following financial documents, write a concise executive summary (3-5 paragraphs) covering:
- What the company does
- Key business segments and revenue drivers
- Recent financial performance highlights
- Strategic priorities

Document excerpts:
{context}

Executive Summary:"""
    return await _llm_text(llm, prompt), cits


async def gen_business_model(session_id: str, llm) -> tuple[str, list[Citation]]:
    context, cits = _get_context(session_id, "business model revenue streams monetisation products services customers")
    prompt = f"""Analyse the business model from these document excerpts. Cover:
- Core products/services
- Revenue model and pricing
- Key customer segments
- Competitive moat / differentiation

Document excerpts:
{context}

Business Model Analysis:"""
    return await _llm_text(llm, prompt), cits


async def gen_swot(session_id: str, llm) -> tuple[SwotAnalysis, list[Citation]]:
    context, cits = _get_context(session_id, "strengths weaknesses opportunities threats competitive advantage risks challenges")
    prompt = f"""Perform a SWOT analysis of this company based on the document excerpts below.
Return ONLY valid JSON in this exact format:
{{
  "strengths": [{{"point": "..."}}],
  "weaknesses": [{{"point": "..."}}],
  "opportunities": [{{"point": "..."}}],
  "threats": [{{"point": "..."}}]
}}
Each list should have 3-5 items.

Document excerpts:
{context}

JSON:"""
    data = await _llm_json(llm, prompt)
    try:
        return SwotAnalysis(
            strengths=[SwotItem(point=x["point"]) for x in data.get("strengths", [])],
            weaknesses=[SwotItem(point=x["point"]) for x in data.get("weaknesses", [])],
            opportunities=[SwotItem(point=x["point"]) for x in data.get("opportunities", [])],
            threats=[SwotItem(point=x["point"]) for x in data.get("threats", [])],
        ), cits
    except Exception:
        logger.warning("SWOT parse failed, using fallback")
        raw = data.get("raw", "Unable to parse SWOT analysis.")
        return SwotAnalysis(
            strengths=[SwotItem(point=raw[:200])],
            weaknesses=[], opportunities=[], threats=[],
        ), cits


async def gen_financial_highlights(session_id: str, llm) -> tuple[list[FinancialHighlight], list[Citation]]:
    context, cits = _get_context(session_id, "revenue profit EBITDA margin cash flow debt earnings growth quarterly annual")
    prompt = f"""Extract key financial metrics from these document excerpts.
Return ONLY valid JSON in this format:
[
  {{"metric": "Revenue", "value": "$X billion", "trend": "up", "note": "YoY growth ..."}},
  {{"metric": "Net Profit", "value": "$X million", "trend": "down", "note": "..."}},
  ...
]
trend must be one of: "up", "down", "neutral".
Include 5-8 metrics.

Document excerpts:
{context}

JSON:"""
    data = await _llm_json(llm, prompt)
    if isinstance(data, list):
        highlights = []
        for item in data:
            try:
                highlights.append(FinancialHighlight(
                    metric=item.get("metric", ""),
                    value=item.get("value", ""),
                    trend=item.get("trend", "neutral"),
                    note=item.get("note"),
                ))
            except Exception:
                continue
        return highlights, cits
    return [], cits


async def gen_risk_factors(session_id: str, llm) -> tuple[list[RiskFactor], list[Citation]]:
    context, cits = _get_context(session_id, "risk factors challenges regulatory competition debt liquidity market risk")
    prompt = f"""Identify the key risk factors from these documents.
Return ONLY valid JSON:
[
  {{"title": "...", "description": "...", "level": "high"}},
  ...
]
level must be one of: "low", "medium", "high", "critical".
Include 4-6 risks.

Document excerpts:
{context}

JSON:"""
    data = await _llm_json(llm, prompt)
    if isinstance(data, list):
        risks = []
        for item in data:
            try:
                risks.append(RiskFactor(
                    title=item.get("title", ""),
                    description=item.get("description", ""),
                    level=RiskLevel(item.get("level", "medium")),
                ))
            except Exception:
                continue
        return risks, cits
    return [], cits


async def gen_growth_opportunities(session_id: str, llm) -> tuple[list[str], list[Citation]]:
    context, cits = _get_context(session_id, "growth opportunities expansion new markets product development R&D strategy")
    prompt = f"""List the key growth opportunities for this company based on the documents.
Return ONLY valid JSON as a list of strings (4-6 items):
["opportunity 1", "opportunity 2", ...]

Document excerpts:
{context}

JSON:"""
    data = await _llm_json(llm, prompt)
    if isinstance(data, list):
        return [str(x) for x in data], cits
    return [], cits


async def gen_market_position(session_id: str, llm) -> tuple[str, list[Citation]]:
    context, cits = _get_context(session_id, "market share competitive landscape industry position competitors market size")
    prompt = f"""Analyse the company's market position and competitive landscape from these documents.
Cover: market share, key competitors, competitive advantages, industry trends.

Document excerpts:
{context}

Market Position Analysis:"""
    return await _llm_text(llm, prompt), cits


async def gen_investment_recommendation(session_id: str, llm, sections_context: str) -> tuple[str, float, list[str]]:
    context, _ = _get_context(session_id, "investment potential valuation returns risks financial performance")
    prompt = f"""Based on the complete due diligence analysis, provide an investment recommendation.
Context summary: {sections_context[:500]}

Additional document excerpts:
{context}

Provide:
1. A clear BUY / HOLD / SELL recommendation with rationale (2-3 paragraphs)
2. A score from 0-10 (10 = strong buy)
3. 3-5 key red flags to watch

Return ONLY valid JSON:
{{
  "recommendation": "BUY/HOLD/SELL",
  "rationale": "...",
  "score": 7.5,
  "red_flags": ["...", "..."]
}}

JSON:"""
    data = await _llm_json(llm, prompt)
    rec_text = f"{data.get('recommendation', 'HOLD')}\n\n{data.get('rationale', '')}"
    score = float(data.get("score", 5.0))
    red_flags = data.get("red_flags", [])
    return rec_text, score, red_flags


# ---------------------------------------------------------------------------
# Main analysis orchestrator
# ---------------------------------------------------------------------------

async def generate_full_analysis(
    session_id: str,
    provider: Optional[LLMProvider] = None,
    sections: Optional[list[str]] = None,
) -> AnalysisReport:
    """
    Orchestrate all analysis sections. Runs sections sequentially
    (could be parallelised with asyncio.gather in future).
    """
    provider = provider or settings.llm_provider
    llm = _build_llm(provider)
    all_citations: list[Citation] = []

    report_kwargs: dict = {
        "session_id": session_id,
        "llm_provider": provider.value,
        "model": settings.active_model,
        "overall_confidence": 0.0,
    }

    sections = sections or [
        "executive_summary", "business_model", "swot",
        "financial_highlights", "risk_factors", "growth_opportunities",
        "market_position", "investment_recommendation",
    ]

    summary_text = ""

    if "executive_summary" in sections:
        logger.info("[%s] Generating executive summary…", session_id)
        text, cits = await gen_executive_summary(session_id, llm)
        report_kwargs["executive_summary"] = text
        all_citations.extend(cits)
        summary_text = text[:300]

    if "business_model" in sections:
        logger.info("[%s] Generating business model…", session_id)
        text, cits = await gen_business_model(session_id, llm)
        report_kwargs["business_model"] = text
        all_citations.extend(cits)

    if "swot" in sections:
        logger.info("[%s] Generating SWOT…", session_id)
        swot, cits = await gen_swot(session_id, llm)
        report_kwargs["swot"] = swot
        all_citations.extend(cits)

    if "financial_highlights" in sections:
        logger.info("[%s] Generating financial highlights…", session_id)
        highlights, cits = await gen_financial_highlights(session_id, llm)
        report_kwargs["financial_highlights"] = highlights
        all_citations.extend(cits)

    if "risk_factors" in sections:
        logger.info("[%s] Generating risk factors…", session_id)
        risks, cits = await gen_risk_factors(session_id, llm)
        report_kwargs["risk_factors"] = risks
        all_citations.extend(cits)

    if "growth_opportunities" in sections:
        logger.info("[%s] Generating growth opportunities…", session_id)
        opps, cits = await gen_growth_opportunities(session_id, llm)
        report_kwargs["growth_opportunities"] = opps
        all_citations.extend(cits)

    if "market_position" in sections:
        logger.info("[%s] Generating market position…", session_id)
        text, cits = await gen_market_position(session_id, llm)
        report_kwargs["market_position"] = text
        all_citations.extend(cits)

    if "investment_recommendation" in sections:
        logger.info("[%s] Generating investment recommendation…", session_id)
        rec, score, red_flags = await gen_investment_recommendation(session_id, llm, summary_text)
        report_kwargs["investment_recommendation"] = rec
        report_kwargs["recommendation_score"] = score
        report_kwargs["red_flags"] = red_flags

    # De-duplicate citations
    seen: set[str] = set()
    unique_cits: list[Citation] = []
    for c in all_citations:
        key = f"{c.source}::{c.page}"
        if key not in seen:
            seen.add(key)
            unique_cits.append(c)

    report_kwargs["citations"] = unique_cits[:20]

    # Overall confidence = avg citation score
    if unique_cits:
        report_kwargs["overall_confidence"] = round(
            sum(c.score for c in unique_cits) / len(unique_cits), 4
        )

    logger.info("[%s] Analysis complete. %d citations.", session_id, len(unique_cits))
    return AnalysisReport(**report_kwargs)


# ---------------------------------------------------------------------------
# Company comparison
# ---------------------------------------------------------------------------

async def generate_comparison(
    session_id_a: str,
    session_id_b: str,
    name_a: str,
    name_b: str,
    provider: Optional[LLMProvider] = None,
) -> ComparisonReport:
    provider = provider or settings.llm_provider
    llm = _build_llm(provider)

    ctx_a, _ = _get_context(session_id_a, "revenue profit margin growth debt market share")
    ctx_b, _ = _get_context(session_id_b, "revenue profit margin growth debt market share")

    prompt = f"""You are comparing two companies for investment due diligence.

Company A: {name_a}
{ctx_a[:1500]}

Company B: {name_b}
{ctx_b[:1500]}

Compare them across key metrics and provide an investment recommendation.
Return ONLY valid JSON:
{{
  "metrics": [
    {{"metric": "Revenue", "company_a": "$X", "company_b": "$Y", "winner": "a", "note": "..."}},
    {{"metric": "Profit Margin", "company_a": "X%", "company_b": "Y%", "winner": "b", "note": "..."}},
    {{"metric": "Debt/Equity", "company_a": "...", "company_b": "...", "winner": "tie", "note": "..."}},
    {{"metric": "Revenue Growth", "company_a": "...", "company_b": "...", "winner": "...", "note": "..."}},
    {{"metric": "Market Position", "company_a": "...", "company_b": "...", "winner": "...", "note": "..."}}
  ],
  "overall_comparison": "...",
  "recommendation": "...",
  "recommended_company": "a"
}}
winner must be "a", "b", or "tie".
recommended_company must be "a", "b", or "tie".

JSON:"""

    data = await _llm_json(llm, prompt)

    metrics = []
    for item in data.get("metrics", []):
        try:
            metrics.append(MetricComparison(
                metric=item.get("metric", ""),
                company_a=item.get("company_a", ""),
                company_b=item.get("company_b", ""),
                winner=item.get("winner"),
                note=item.get("note"),
            ))
        except Exception:
            continue

    return ComparisonReport(
        session_a_name=name_a,
        session_b_name=name_b,
        metrics=metrics,
        overall_comparison=data.get("overall_comparison", ""),
        recommendation=data.get("recommendation", ""),
        recommended_company=data.get("recommended_company"),
    )
