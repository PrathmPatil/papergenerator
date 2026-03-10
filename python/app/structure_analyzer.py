# app/structure_analyzer.py
import re
from typing import Dict, Any, List, Optional
import numpy as np
from collections import Counter

class StructureAnalyzer:
    def __init__(self):
        self.patterns = {
            'question': [
                r'^Q(?:uestion)?\.?\s*\d+',
                r'^\d+\.\s+',
                r'^\(\d+\)\s+',
                r'^\[?\d+\]?\s+'
            ],
            'header': [
                r'^[A-Z][A-Z\s]+$',
                r'^Chapter\s+\d+',
                r'^Section\s+\d+'
            ],
            'footer': [
                r'^\d+$',
                r'^Page\s+\d+'
            ],
            'list_item': [
                r'^[•\-*]\s+',
                r'^[a-z]\)\s+',
                r'^\d+\.\s+'
            ]
        }
    
    async def analyze_page(self, page_content: Dict[str, Any], 
                          structure_type: str) -> Dict[str, Any]:
        """
        Analyze page structure and identify elements
        """
        text = page_content.get('text', '')
        lines = text.split('\n')
        
        # Analyze line by line
        structure = {
            'type': self._determine_page_type(lines),
            'elements': [],
            'statistics': self._calculate_statistics(text),
            'layout': self._analyze_layout(page_content)
        }
        
        # Identify structural elements
        for i, line in enumerate(lines):
            if line.strip():
                element = self._classify_line(line, i, lines)
                if element:
                    structure['elements'].append(element)
        
        return structure
    
    def _determine_page_type(self, lines: List[str]) -> str:
        """
        Determine the type of page (cover, toc, content, etc.)
        """
        if len(lines) < 5:
            return 'sparse'
        
        # Check for common patterns
        first_line = lines[0].strip() if lines else ''
        
        if re.search(r'(table of contents|contents)', first_line, re.IGNORECASE):
            return 'toc'
        
        if re.search(r'(chapter|section)\s+\d+', first_line, re.IGNORECASE):
            return 'chapter_start'
        
        if re.search(r'(index|glossary)', first_line, re.IGNORECASE):
            return 'index'
        
        # Check if it's mostly numbers (possible question paper)
        number_count = sum(1 for line in lines if re.search(r'^\d+\.', line))
        if number_count > len(lines) * 0.3:
            return 'question_paper'
        
        return 'content'
    
    def _classify_line(self, line: str, index: int, 
                       all_lines: List[str]) -> Optional[Dict[str, Any]]:
        """
        Classify a line into a structural element
        """
        stripped = line.strip()
        
        # Check if it's a header
        if self._is_header(stripped, index, all_lines):
            return {
                'type': 'header',
                'content': stripped,
                'level': self._determine_header_level(stripped)
            }
        
        # Check if it's a footer
        if self._is_footer(stripped, index, all_lines):
            return {
                'type': 'footer',
                'content': stripped
            }
        
        # Check if it's a question
        if self._is_question(stripped):
            return {
                'type': 'question',
                'content': stripped,
                'number': self._extract_question_number(stripped)
            }
        
        # Check if it's a list item
        if self._is_list_item(stripped):
            return {
                'type': 'list_item',
                'content': stripped
            }
        
        # Regular paragraph
        return {
            'type': 'paragraph',
            'content': stripped
        }
    
    def _is_header(self, line: str, index: int, all_lines: List[str]) -> bool:
        """
        Determine if a line is a header
        """
        # All caps often indicate headers
        if line.isupper() and len(line) > 3:
            return True
        
        # Short lines at top of page might be headers
        if index < 3 and len(line) < 100:
            return True
        
        # Common header patterns
        for pattern in self.patterns['header']:
            if re.match(pattern, line, re.IGNORECASE):
                return True
        
        return False
    
    def _is_footer(self, line: str, index: int, all_lines: List[str]) -> bool:
        """
        Determine if a line is a footer
        """
        # Check if it's at the bottom of page
        if index > len(all_lines) - 3:
            # Page numbers
            if line.isdigit():
                return True
            
            # Common footer patterns
            for pattern in self.patterns['footer']:
                if re.match(pattern, line, re.IGNORECASE):
                    return True
        
        return False
    
    def _is_question(self, line: str) -> bool:
        """
        Determine if a line is a question
        """
        for pattern in self.patterns['question']:
            if re.match(pattern, line, re.IGNORECASE):
                return True
        return False
    
    def _is_list_item(self, line: str) -> bool:
        """
        Determine if a line is a list item
        """
        for pattern in self.patterns['list_item']:
            if re.match(pattern, line):
                return True
        return False
    
    def _determine_header_level(self, line: str) -> int:
        """
        Determine header level (1 for main headers, 2 for subheaders, etc.)
        """
        if line.isupper():
            return 1
        
        if re.match(r'^Chapter\s+\d+', line, re.IGNORECASE):
            return 1
        
        if re.match(r'^Section\s+\d+', line, re.IGNORECASE):
            return 2
        
        return 3
    
    def _extract_question_number(self, line: str) -> Optional[int]:
        """
        Extract question number from line
        """
        patterns = [
            r'Q(?:uestion)?\.?\s*(\d+)',
            r'^(\d+)\.',
            r'\((\d+)\)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                return int(match.group(1))
        
        return None
    
    def _calculate_statistics(self, text: str) -> Dict[str, Any]:
        """
        Calculate text statistics
        """
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        
        return {
            'word_count': len(words),
            'sentence_count': len([s for s in sentences if s.strip()]),
            'avg_word_length': np.mean([len(w) for w in words]) if words else 0,
            'unique_words': len(set(words))
        }
    
    def _analyze_layout(self, page_content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze page layout structure
        """
        layout = {
            'has_images': len(page_content.get('images', [])) > 0,
            'has_tables': len(page_content.get('tables', [])) > 0,
            'columns': self._detect_columns(page_content.get('text', '')),
            'text_density': self._calculate_text_density(page_content)
        }
        
        return layout
    
    def _detect_columns(self, text: str) -> int:
        """
        Detect number of columns in page
        """
        lines = text.split('\n')
        
        # Look for tabular structure
        tab_count = sum(line.count('\t') for line in lines)
        
        if tab_count > len(lines) * 2:
            return 2
        
        return 1
    
    def _calculate_text_density(self, page_content: Dict[str, Any]) -> float:
        """
        Calculate text density on page
        """
        text = page_content.get('text', '')
        words = len(text.split())
        
        # Rough estimate based on word count
        if words < 100:
            return 0.3
        elif words < 300:
            return 0.6
        else:
            return 1.0