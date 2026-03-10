# app/models.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ExtractionType(str, Enum):
    AUTO = "auto"
    TEXT_ONLY = "text_only"
    STRUCTURED = "structured"
    OCR = "ocr"
    HYBRID = "hybrid"

class StructureType(str, Enum):
    BOOK = "book"
    QUESTION_PAPER = "question_paper"
    MIXED = "mixed"
    UNKNOWN = "unknown"

class PageContent(BaseModel):
    page_number: int
    text: str
    images: List[Dict[str, Any]] = []
    tables: List[Dict[str, Any]] = []
    paragraphs: List[Dict[str, Any]] = []
    headers: List[str] = []
    footers: List[str] = []
    
class QuestionPaperStructure(BaseModel):
    title: str
    subject: Optional[str]
    exam_type: Optional[str]
    year: Optional[str]
    total_marks: Optional[int]
    duration: Optional[str]
    instructions: List[str] = []
    sections: List[Dict[str, Any]] = []
    questions: List[Dict[str, Any]] = []
    
class BookStructure(BaseModel):
    title: str
    authors: List[str] = []
    publisher: Optional[str]
    isbn: Optional[str]
    edition: Optional[str]
    chapters: List[Dict[str, Any]] = []
    toc: List[Dict[str, Any]] = []
    index: List[Dict[str, Any]] = []
    
class ExtractionMetadata(BaseModel):
    total_pages: int
    file_size: int
    extraction_time: float
    ocr_used: bool
    language_detected: str
    confidence_score: float
    structure_type: StructureType
    
class ExtractionRequest(BaseModel):
    job_id: str
    file_path: str
    extraction_type: ExtractionType = ExtractionType.AUTO
    language: str = "eng"
    structure_type: StructureType = StructureType.MIXED
    status: str = "queued"
    created_at: datetime
    progress: int = 0
    message: Optional[str] = None
    
class ExtractionResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metadata: Optional[ExtractionMetadata] = None