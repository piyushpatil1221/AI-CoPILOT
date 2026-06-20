"""
parser.py — PDF parsing and intelligent text chunking.
Uses PyMuPDF (fitz) as primary parser and pdfplumber for table extraction.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter

from config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ParsedChunk:
    """A single text chunk ready for embedding."""
    text: str
    source: str          # original filename
    page: int            # 1-indexed
    chunk_index: int
    section_title: Optional[str] = None
    is_table: bool = False
    char_count: int = field(init=False)

    def __post_init__(self):
        self.char_count = len(self.text)

    def to_metadata(self) -> dict:
        return {
            "source": self.source,
            "page": self.page,
            "chunk_index": self.chunk_index,
            "section_title": self.section_title or "",
            "is_table": self.is_table,
        }


@dataclass
class ParsedDocument:
    filename: str
    page_count: int
    chunks: list[ParsedChunk]
    title: Optional[str] = None
    author: Optional[str] = None

    @property
    def chunk_count(self) -> int:
        return len(self.chunks)


# ---------------------------------------------------------------------------
# Section detection helpers
# ---------------------------------------------------------------------------

# Headings: ALL CAPS lines, numbered sections, common financial headings
_HEADING_RE = re.compile(
    r"^(?:"
    r"[A-Z][A-Z\s&,\-:]{4,60}|"           # ALL CAPS headings
    r"\d+[\.\)]\s+[A-Z][^\n]{3,60}|"       # 1. Heading  /  1) Heading
    r"(?:ITEM|SECTION|PART|CHAPTER)\s+\d+"  # ITEM 1A, SECTION 2 …
    r")$",
    re.MULTILINE,
)


def _detect_section_title(text: str) -> Optional[str]:
    """Return the first heading-like line found in a text block."""
    for line in text.splitlines():
        line = line.strip()
        if _HEADING_RE.match(line):
            return line[:80]
    return None


# ---------------------------------------------------------------------------
# Table extraction helpers
# ---------------------------------------------------------------------------

def _extract_tables_from_page(pdf_path: Path, page_number: int) -> list[str]:
    """Extract tables from a specific page using pdfplumber, returning markdown."""
    tables_md: list[str] = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if page_number - 1 >= len(pdf.pages):
                return tables_md
            page = pdf.pages[page_number - 1]
            for table in page.extract_tables():
                if not table:
                    continue
                rows = [
                    [str(cell) if cell else "" for cell in row]
                    for row in table
                ]
                # Build markdown table
                if len(rows) < 2:
                    continue
                header = "| " + " | ".join(rows[0]) + " |"
                separator = "| " + " | ".join(["---"] * len(rows[0])) + " |"
                body = "\n".join(
                    "| " + " | ".join(row) + " |" for row in rows[1:]
                )
                tables_md.append(f"{header}\n{separator}\n{body}")
    except Exception as exc:
        logger.warning("pdfplumber table extraction failed on page %d: %s", page_number, exc)
    return tables_md


# ---------------------------------------------------------------------------
# Core parser
# ---------------------------------------------------------------------------

class PDFParser:
    """Parse a PDF file into structured, embeddable chunks."""

    def __init__(self):
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
            length_function=len,
        )

    def parse(self, file_path: Path) -> ParsedDocument:
        """Main entry point. Returns a ParsedDocument."""
        logger.info("Parsing PDF: %s", file_path.name)
        file_path = Path(file_path)

        # ── Open with PyMuPDF ──────────────────────────────────────────────
        doc = fitz.open(str(file_path))
        meta = doc.metadata or {}
        page_count = len(doc)

        raw_chunks: list[ParsedChunk] = []
        chunk_idx = 0

        for page_num in range(page_count):
            page = doc[page_num]
            page_number = page_num + 1

            # ── Extract text blocks ────────────────────────────────────────
            text = page.get_text("text").strip()
            if not text:
                continue

            # ── Split into sub-chunks ──────────────────────────────────────
            sub_texts = self._splitter.split_text(text)
            current_section: Optional[str] = None

            for sub in sub_texts:
                sub = sub.strip()
                if len(sub) < 50:   # skip noise
                    continue
                detected = _detect_section_title(sub)
                if detected:
                    current_section = detected

                raw_chunks.append(
                    ParsedChunk(
                        text=sub,
                        source=file_path.name,
                        page=page_number,
                        chunk_index=chunk_idx,
                        section_title=current_section,
                        is_table=False,
                    )
                )
                chunk_idx += 1

            # ── Extract tables ─────────────────────────────────────────────
            tables = _extract_tables_from_page(file_path, page_number)
            for table_md in tables:
                if len(table_md) < 30:
                    continue
                raw_chunks.append(
                    ParsedChunk(
                        text=table_md,
                        source=file_path.name,
                        page=page_number,
                        chunk_index=chunk_idx,
                        section_title=current_section,
                        is_table=True,
                    )
                )
                chunk_idx += 1

        doc.close()
        logger.info(
            "Parsed '%s': %d pages → %d chunks",
            file_path.name, page_count, chunk_idx,
        )

        return ParsedDocument(
            filename=file_path.name,
            page_count=page_count,
            chunks=raw_chunks,
            title=meta.get("title") or file_path.stem,
            author=meta.get("author"),
        )


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

pdf_parser = PDFParser()
