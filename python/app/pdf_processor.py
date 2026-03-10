# app/pdf_processor.py
import asyncio
import fitz  # PyMuPDF
from pdf2image import convert_from_path
import cv2
import numpy as np
from PIL import Image
import io
import json
from typing import Dict, Any, List, Optional
import pytesseract
from transformers import pipeline
import easyocr
import layoutparser as lp
from datetime import datetime
import hashlib

from app.ocr_engine import OCREngine
from app.text_extractor import TextExtractor
from app.structure_analyzer import StructureAnalyzer

class PDFProcessor:
    def __init__(self):
        self.ocr_engine = OCREngine()
        self.text_extractor = TextExtractor()
        self.structure_analyzer = StructureAnalyzer()
        
        # Initialize layout model
        self.layout_model = lp.Detectron2LayoutModel(
            'lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config',
            extra_config=["MODEL.ROI_HEADS.SCORE_THRESH_TEST", 0.5],
            label_map={0: "text", 1: "title", 2: "list", 3: "table", 4: "figure"}
        )
        
    async def process_pdf(self, file_path: str, extraction_type: str, 
                          language: str, structure_type: str) -> Dict[str, Any]:
        """
        Main PDF processing pipeline
        """
        start_time = datetime.now()
        
        # Open PDF
        pdf_document = fitz.open(file_path)
        total_pages = len(pdf_document)
        
        # Initialize result structure
        result = {
            "document_info": {},
            "pages": [],
            "extracted_data": {},
            "metadata": {}
        }
        
        # Process each page
        for page_num in range(total_pages):
            page = pdf_document[page_num]
            
            # Extract text based on availability
            page_text = page.get_text()
            
            # Check if text is selectable (not scanned)
            if len(page_text.strip()) < 50:  # Probably scanned
                # Use OCR for scanned pages
                page_content = await self._process_scanned_page(
                    page, page_num, language
                )
            else:
                # Use direct text extraction
                page_content = await self._process_text_page(
                    page, page_num, language
                )
            
            # Analyze page structure
            page_structure = await self.structure_analyzer.analyze_page(
                page_content, structure_type
            )
            
            page_content["structure"] = page_structure
            result["pages"].append(page_content)
        
        # Extract document-level information
        document_info = await self._extract_document_info(result["pages"])
        result["document_info"] = document_info
        
        # Structure-specific extraction
        if structure_type == "question_paper":
            result["extracted_data"] = await self._extract_question_paper(result)
        elif structure_type == "book":
            result["extracted_data"] = await self._extract_book(result)
        
        # Calculate metadata
        end_time = datetime.now()
        result["metadata"] = {
            "total_pages": total_pages,
            "processing_time": (end_time - start_time).total_seconds(),
            "file_hash": self._calculate_file_hash(file_path),
            "extraction_type": extraction_type,
            "language": language
        }
        
        pdf_document.close()
        
        return result
    
    async def _process_scanned_page(self, page, page_num: int, 
                                     language: str) -> Dict[str, Any]:
        """
        Process scanned page using OCR
        """
        # Convert PDF page to image
        pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        # Perform OCR
        ocr_result = await self.ocr_engine.perform_ocr(img, language)
        
        # Detect layout
        layout = self.layout_model.detect(img)
        
        # Extract elements based on layout
        elements = self._extract_elements_by_layout(img, layout)
        
        return {
            "page_number": page_num + 1,
            "text": ocr_result["text"],
            "ocr_confidence": ocr_result["confidence"],
            "images": elements.get("images", []),
            "tables": elements.get("tables", []),
            "paragraphs": elements.get("paragraphs", []),
            "layout_blocks": layout.to_dict()
        }
    
    async def _process_text_page(self, page, page_num: int, 
                                  language: str) -> Dict[str, Any]:
        """
        Process page with selectable text
        """
        # Extract text blocks
        text_blocks = page.get_text("dict")
        
        # Extract images
        image_list = page.get_images()
        images = []
        
        for img_index, img in enumerate(image_list):
            xref = img[0]
            pix = fitz.Pixmap(page.parent, xref)
            if pix.n - pix.alpha < 4:  # Can save as PNG
                img_data = pix.tobytes("png")
                images.append({
                    "index": img_index,
                    "data": img_data.hex(),
                    "bbox": page.get_image_bbox(img)
                })
        
        # Extract text
        text = page.get_text()
        
        # Detect paragraphs
        paragraphs = self._extract_paragraphs(text_blocks)
        
        return {
            "page_number": page_num + 1,
            "text": text,
            "images": images,
            "paragraphs": paragraphs,
            "text_blocks": text_blocks
        }
    
    def _extract_elements_by_layout(self, img, layout):
        """
        Extract specific elements based on layout detection
        """
        elements = {
            "images": [],
            "tables": [],
            "paragraphs": []
        }
        
        for block in layout:
            # Crop image to block region
            x1, y1, x2, y2 = block.block.coordinates
            cropped = img.crop((x1, y1, x2, y2))
            
            if block.type == 4:  # Figure/Image
                elements["images"].append({
                    "bbox": [x1, y1, x2, y2],
                    "data": self._image_to_base64(cropped)
                })
            elif block.type == 3:  # Table
                # Extract table using specialized table detection
                table_data = self._extract_table(cropped)
                elements["tables"].append(table_data)
            elif block.type == 0:  # Text
                # Extract text from this region
                text = pytesseract.image_to_string(cropped)
                elements["paragraphs"].append({
                    "bbox": [x1, y1, x2, y2],
                    "text": text
                })
        
        return elements
    
    async def _extract_document_info(self, pages: List[Dict]) -> Dict[str, Any]:
        """
        Extract document-level information (title, author, etc.)
        """
        # Combine text from first few pages
        first_pages_text = " ".join([p["text"] for p in pages[:3]])
        
        # Use NLP to extract metadata
        doc_info = {
            "title": self._extract_title(first_pages_text),
            "authors": self._extract_authors(first_pages_text),
            "language": self._detect_language(first_pages_text),
            "estimated_pages": len(pages)
        }
        
        return doc_info
    
    async def _extract_question_paper(self, result: Dict) -> Dict[str, Any]:
        """
        Extract structured data from question paper
        """
        question_paper = {
            "header": {},
            "instructions": [],
            "sections": [],
            "questions": [],
            "total_marks": 0
        }
        
        # Analyze each page
        for page in result["pages"]:
            # Extract header information
            if page["page_number"] == 1:
                question_paper["header"] = self._extract_question_paper_header(page["text"])
            
            # Extract questions using pattern matching
            questions = self._extract_questions(page["text"])
            question_paper["questions"].extend(questions)
        
        # Group questions into sections
        question_paper["sections"] = self._group_into_sections(question_paper["questions"])
        
        # Calculate total marks
        question_paper["total_marks"] = self._calculate_total_marks(question_paper["questions"])
        
        return question_paper
    
    async def _extract_book(self, result: Dict) -> Dict[str, Any]:
        """
        Extract structured data from book
        """
        book = {
            "metadata": {},
            "chapters": [],
            "toc": [],
            "index": []
        }
        
        # Extract table of contents
        book["toc"] = self._extract_toc(result["pages"])
        
        # Extract chapters
        book["chapters"] = self._extract_chapters(result["pages"])
        
        # Extract index if present
        book["index"] = self._extract_index(result["pages"])
        
        return book
    
    def _extract_title(self, text: str) -> str:
        """Extract title from text using heuristics"""
        # Simple heuristic: first non-empty line that's not too long
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line and len(line) < 200 and not line.isupper():
                return line
        return "Unknown Title"
    
    def _extract_authors(self, text: str) -> List[str]:
        """Extract authors from text"""
        # Look for common author patterns
        import re
        author_patterns = [
            r'by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'authors?:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'written\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
        ]
        
        authors = []
        for pattern in author_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            authors.extend(matches)
        
        return authors if authors else ["Unknown"]
    
    def _detect_language(self, text: str) -> str:
        """Detect language of text"""
        from langdetect import detect
        try:
            return detect(text[:1000])  # Detect from first 1000 chars
        except:
            return "unknown"
    
    def _extract_questions(self, text: str) -> List[Dict]:
        """Extract questions from text"""
        import re
        
        questions = []
        
        # Pattern for numbered questions
        patterns = [
            r'Q(?:uestion)?\.?\s*(\d+)[.)]\s*(.+?)(?=Q(?:uestion)?\.?\s*\d+[.)]|$)',
            r'(\d+)[.)]\s*(.+?)(?=\d+[.)]|$)',
            r'\((\d+)\)\s*(.+?)(?=\(\d+\)|$)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
            if matches:
                for q_num, q_text in matches:
                    questions.append({
                        "number": int(q_num),
                        "text": q_text.strip(),
                        "marks": self._extract_marks(q_text)
                    })
                break
        
        return questions
    
    def _extract_marks(self, text: str) -> Optional[int]:
        """Extract marks from question text"""
        import re
        
        # Look for marks patterns
        patterns = [
            r'\((\d+)\s*marks?\)',
            r'\[(\d+)\s*marks?\]',
            r'(\d+)\s*marks?'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return int(match.group(1))
        
        return None
    
    def _group_into_sections(self, questions: List[Dict]) -> List[Dict]:
        """Group questions into sections"""
        sections = []
        current_section = {"name": "General", "questions": [], "marks": 0}
        
        for question in questions:
            # Check if this question starts a new section
            if "Section" in question.get("text", ""):
                if current_section["questions"]:
                    sections.append(current_section)
                current_section = {
                    "name": self._extract_section_name(question["text"]),
                    "questions": [],
                    "marks": 0
                }
            
            current_section["questions"].append(question)
            if question.get("marks"):
                current_section["marks"] += question["marks"]
        
        if current_section["questions"]:
            sections.append(current_section)
        
        return sections
    
    def _calculate_total_marks(self, questions: List[Dict]) -> int:
        """Calculate total marks from all questions"""
        total = 0
        for q in questions:
            if q.get("marks"):
                total += q["marks"]
        return total
    
    def _extract_toc(self, pages: List[Dict]) -> List[Dict]:
        """Extract table of contents"""
        toc = []
        
        # TOC is usually in first few pages
        for page in pages[:5]:
            lines = page["text"].split('\n')
            for line in lines:
                # Look for chapter patterns
                if re.search(r'(chapter|section)\s+\d+', line, re.IGNORECASE):
                    toc.append({
                        "title": line.strip(),
                        "page": self._extract_page_number(line)
                    })
        
        return toc
    
    def _extract_chapters(self, pages: List[Dict]) -> List[Dict]:
        """Extract chapters from book"""
        chapters = []
        current_chapter = None
        
        for page in pages:
            # Detect chapter start
            if re.search(r'^chapter\s+\d+', page["text"][:200], re.IGNORECASE):
                if current_chapter:
                    chapters.append(current_chapter)
                
                current_chapter = {
                    "title": self._extract_chapter_title(page["text"]),
                    "start_page": page["page_number"],
                    "content": [page["text"]],
                    "pages": [page["page_number"]]
                }
            elif current_chapter:
                current_chapter["content"].append(page["text"])
                current_chapter["pages"].append(page["page_number"])
        
        if current_chapter:
            chapters.append(current_chapter)
        
        return chapters
    
    def _extract_index(self, pages: List[Dict]) -> List[Dict]:
        """Extract index from book"""
        index_items = []
        
        # Index is usually at the end
        for page in pages[-10:]:
            lines = page["text"].split('\n')
            for line in lines:
                # Look for index patterns
                if re.search(r'[a-z]+\s*\.{2,}\s*\d+', line, re.IGNORECASE):
                    parts = line.split('...')
                    if len(parts) == 2:
                        index_items.append({
                            "term": parts[0].strip(),
                            "page": parts[1].strip()
                        })
        
        return index_items
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA256 hash of file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def _image_to_base64(self, img):
        """Convert PIL image to base64 string"""
        import base64
        from io import BytesIO
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()
    
    def _extract_paragraphs(self, text_blocks):
        """Extract paragraphs from text blocks"""
        paragraphs = []
        
        if "blocks" in text_blocks:
            for block in text_blocks["blocks"]:
                if "lines" in block:
                    para_text = ""
                    for line in block["lines"]:
                        for span in line["spans"]:
                            para_text += span["text"] + " "
                    
                    if para_text.strip():
                        paragraphs.append({
                            "text": para_text.strip(),
                            "bbox": block.get("bbox", [])
                        })
        
        return paragraphs
    
    def _extract_table(self, img):
        """Extract table from image"""
        # Use OCR to extract table data
        try:
            # Convert image to grayscale
            gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
            
            # Use threshold to get binary image
            _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
            
            # Detect horizontal and vertical lines
            horizontal = self._detect_lines(binary, direction='horizontal')
            vertical = self._detect_lines(binary, direction='vertical')
            
            # Combine lines to find cells
            cells = self._find_cells(horizontal, vertical)
            
            # Extract text from each cell
            table_data = []
            for cell in cells:
                cell_img = img.crop(cell)
                cell_text = pytesseract.image_to_string(cell_img).strip()
                table_data.append({
                    "bbox": cell,
                    "text": cell_text
                })
            
            return {"cells": table_data, "rows": len(set([c[1] for c in cells])), 
                    "columns": len(set([c[0] for c in cells]))}
        except:
            return {"error": "Failed to extract table"}
    
    def _detect_lines(self, binary_img, direction='horizontal'):
        """Detect horizontal or vertical lines in image"""
        if direction == 'horizontal':
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        else:
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
        
        lines = cv2.morphologyEx(binary_img, cv2.MORPH_OPEN, kernel)
        return lines
    
    def _find_cells(self, horizontal_lines, vertical_lines):
        """Find table cells from line intersections"""
        # This is a simplified version
        # In production, you'd want more sophisticated cell detection
        return []