# app/utils.py
import os
import shutil
import aiofiles
from fastapi import UploadFile
from typing import Optional
import tempfile

TEMP_DIR = "temp_uploads"

async def save_upload_file(file: UploadFile, job_id: str) -> str:
    """
    Save uploaded file to temporary directory
    """
    # Create temp directory if it doesn't exist
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    # Create job-specific directory
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(job_dir, file.filename)
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return file_path

async def cleanup_temp_files(job_id: str):
    """
    Clean up temporary files for a job
    """
    job_dir = os.path.join(TEMP_DIR, job_id)
    if os.path.exists(job_dir):
        shutil.rmtree(job_dir)

def get_file_size(file_path: str) -> int:
    """
    Get file size in bytes
    """
    return os.path.getsize(file_path)

def ensure_dir(directory: str):
    """
    Ensure directory exists
    """
    os.makedirs(directory, exist_ok=True)