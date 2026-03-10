# app/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import uuid
import os
import shutil
from datetime import datetime
from pydantic import BaseModel
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.pdf_processor import PDFProcessor
from app.models import ExtractionRequest, ExtractionResponse, ExtractionStatus
from app.utils import save_upload_file, cleanup_temp_files

app = FastAPI(title="PDF Scraper API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processor
pdf_processor = PDFProcessor()

# Store extraction jobs
extraction_jobs = {}

class ExtractionJobResponse(BaseModel):
    job_id: str
    status: str
    message: str

@app.post("/api/v1/extract", response_model=ExtractionJobResponse)
async def extract_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    extraction_type: Optional[str] = "auto",
    language: Optional[str] = "eng",
    structure_type: Optional[str] = "book"  # book, question_paper, mixed
):
    """
    Extract data from PDF document (book or question paper)
    Returns a job ID for tracking the extraction process
    """
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Save uploaded file
        file_path = await save_upload_file(file, job_id)
        
        # Create extraction request
        request = ExtractionRequest(
            job_id=job_id,
            file_path=file_path,
            extraction_type=extraction_type,
            language=language,
            structure_type=structure_type,
            status="queued",
            created_at=datetime.now()
        )
        
        # Store job
        extraction_jobs[job_id] = request
        
        # Process in background
        background_tasks.add_task(process_extraction, job_id)
        
        return ExtractionJobResponse(
            job_id=job_id,
            status="queued",
            message="Extraction job queued successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/extract/{job_id}", response_model=ExtractionResponse)
async def get_extraction_result(job_id: str):
    """
    Get the result of an extraction job
    """
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = extraction_jobs[job_id]
    
    return ExtractionResponse(
        job_id=job_id,
        status=job.status,
        result=job.result,
        error=job.error,
        metadata=job.metadata
    )

@app.get("/api/v1/extract/{job_id}/status")
async def get_extraction_status(job_id: str):
    """
    Get the status of an extraction job
    """
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = extraction_jobs[job_id]
    
    return {
        "job_id": job_id,
        "status": job.status,
        "progress": job.progress,
        "message": job.message
    }

@app.delete("/api/v1/extract/{job_id}")
async def delete_extraction_job(job_id: str):
    """
    Delete an extraction job and associated files
    """
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Cleanup files
    await cleanup_temp_files(job_id)
    
    # Remove job
    del extraction_jobs[job_id]
    
    return {"message": "Job deleted successfully"}

async def process_extraction(job_id: str):
    """
    Background task to process PDF extraction
    """
    try:
        job = extraction_jobs[job_id]
        job.status = "processing"
        job.message = "Starting PDF extraction..."
        
        # Process PDF
        result = await pdf_processor.process_pdf(
            file_path=job.file_path,
            extraction_type=job.extraction_type,
            language=job.language,
            structure_type=job.structure_type
        )
        
        # Update job with result
        job.status = "completed"
        job.result = result
        job.message = "Extraction completed successfully"
        job.progress = 100
        
    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.message = f"Extraction failed: {str(e)}"
        
    finally:
        # Cleanup uploaded file
        await cleanup_temp_files(job_id)

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}