# app/ocr_engine.py
import easyocr
import pytesseract
from PIL import Image
import numpy as np
import cv2
from typing import Dict, Any, List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

class OCREngine:
    def __init__(self):
        # Initialize EasyOCR for multiple languages
        self.reader = easyocr.Reader(['en', 'hi', 'fr', 'de', 'es'], gpu=True)
        self.executor = ThreadPoolExecutor(max_workers=4)
        
    async def perform_ocr(self, image, language: str = 'en') -> Dict[str, Any]:
        """
        Perform OCR on image using multiple engines for better accuracy
        """
        # Convert PIL Image to numpy array if needed
        if isinstance(image, Image.Image):
            img_np = np.array(image)
        else:
            img_np = image
        
        # Preprocess image
        processed_img = self._preprocess_image(img_np)
        
        # Run OCR with multiple engines in parallel
        tasks = [
            self._run_easyocr(processed_img, language),
            self._run_tesseract(processed_img, language)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Merge and improve results
        merged_result = self._merge_ocr_results(results)
        
        return merged_result
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for better OCR accuracy
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=30)
        
        # Adaptive thresholding
        binary = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Remove borders
        result = self._remove_borders(binary)
        
        return result
    
    def _remove_borders(self, image: np.ndarray) -> np.ndarray:
        """
        Remove borders from scanned images
        """
        # Find contours
        contours, _ = cv2.findContours(image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get the largest contour (assuming it's the content area)
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Crop to content area
            image = image[y:y+h, x:x+w]
        
        return image
    
    async def _run_easyocr(self, image: np.ndarray, language: str) -> Dict[str, Any]:
        """
        Run EasyOCR on image
        """
        loop = asyncio.get_event_loop()
        
        def _ocr():
            results = self.reader.readtext(image, paragraph=True)
            
            text = ""
            confidence_sum = 0
            word_count = 0
            
            for (bbox, text_item, prob) in results:
                text += text_item + " "
                confidence_sum += prob
                word_count += 1
            
            avg_confidence = confidence_sum / word_count if word_count > 0 else 0
            
            return {
                "engine": "easyocr",
                "text": text.strip(),
                "confidence": avg_confidence,
                "details": results
            }
        
        return await loop.run_in_executor(self.executor, _ocr)
    
    async def _run_tesseract(self, image: np.ndarray, language: str) -> Dict[str, Any]:
        """
        Run Tesseract OCR on image
        """
        loop = asyncio.get_event_loop()
        
        def _ocr():
            # Configure Tesseract
            custom_config = r'--oem 3 --psm 6'
            
            # Perform OCR
            text = pytesseract.image_to_string(
                image, 
                lang=language,
                config=custom_config
            )
            
            # Get confidence data
            data = pytesseract.image_to_data(
                image, 
                lang=language,
                config=custom_config,
                output_type=pytesseract.Output.DICT
            )
            
            # Calculate average confidence
            confidences = [int(conf) for conf in data['conf'] if conf != '-1']
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                "engine": "tesseract",
                "text": text.strip(),
                "confidence": avg_confidence,
                "details": data
            }
        
        return await loop.run_in_executor(self.executor, _ocr)
    
    def _merge_ocr_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Merge results from multiple OCR engines for better accuracy
        """
        # Sort by confidence
        results.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Use highest confidence result as base
        best_result = results[0]
        
        # For now, return best result
        # In production, you might want to implement more sophisticated merging
        
        return {
            "text": best_result['text'],
            "confidence": best_result['confidence'],
            "engine_used": best_result['engine'],
            "all_results": results
        }