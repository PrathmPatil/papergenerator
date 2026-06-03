import json
import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from uuid import uuid4


@dataclass(frozen=True)
class ConversionRecord:
    job_id: str
    original_filename: str
    job_dir: Path
    input_pdf_path: Path
    output_docx_path: Path
    images_dir: Path
    metadata_path: Path


@dataclass(frozen=True)
class ExcelPackageRecord:
    job_id: str
    original_filename: str
    job_dir: Path
    input_docx_path: Path
    package_zip_path: Path
    metadata_path: Path


class ConversionStorageService:
    def __init__(self, storage_root: Optional[Path] = None) -> None:
        configured_root = storage_root or Path(
            os.environ.get("CONVERSION_STORAGE_ROOT", "storage/conversions")
        )
        self.storage_root = configured_root.resolve()

    def _validate_job_id(self, job_id: str) -> str:
        normalized_job_id = str(job_id or "").strip()
        if not re.fullmatch(r"[0-9a-f]{32}", normalized_job_id):
            raise FileNotFoundError(f"Conversion not found: {job_id}")
        return normalized_job_id

    def create_record(self, original_filename: str) -> ConversionRecord:
        job_id = uuid4().hex
        job_dir = self.storage_root / job_id
        images_dir = job_dir / "images"
        input_pdf_path = job_dir / "input.pdf"
        output_docx_path = job_dir / "output.docx"
        metadata_path = job_dir / "metadata.json"

        images_dir.mkdir(parents=True, exist_ok=True)

        return ConversionRecord(
            job_id=job_id,
            original_filename=original_filename,
            job_dir=job_dir,
            input_pdf_path=input_pdf_path,
            output_docx_path=output_docx_path,
            images_dir=images_dir,
            metadata_path=metadata_path,
        )

    def get_record(self, job_id: str) -> ConversionRecord:
        job_id = self._validate_job_id(job_id)
        job_dir = self.storage_root / job_id
        metadata_path = job_dir / "metadata.json"

        if not metadata_path.exists():
            raise FileNotFoundError(f"Conversion not found: {job_id}")

        metadata = self.read_metadata(job_id)

        return ConversionRecord(
            job_id=job_id,
            original_filename=metadata.get("original_filename", "input.pdf"),
            job_dir=job_dir,
            input_pdf_path=job_dir / "input.pdf",
            output_docx_path=job_dir / "output.docx",
            images_dir=job_dir / "images",
            metadata_path=metadata_path,
        )

    def write_metadata(
        self,
        record: ConversionRecord,
        status: str,
        images: List[str],
        error: str = "",
    ) -> Dict:
        metadata = {
            "job_id": record.job_id,
            "status": status,
            "original_filename": record.original_filename,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "files": {
                "input_pdf": str(record.input_pdf_path),
                "output_docx": str(record.output_docx_path),
                "images_dir": str(record.images_dir),
                "images": images,
            },
            "error": error,
        }

        record.metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
        return metadata

    def read_metadata(self, job_id: str) -> Dict:
        job_id = self._validate_job_id(job_id)
        metadata_path = self.storage_root / job_id / "metadata.json"
        return json.loads(metadata_path.read_text(encoding="utf-8"))

    def list_records(self, limit: int = 25) -> List[Dict]:
        if not self.storage_root.exists():
            return []

        records = []
        for metadata_path in self.storage_root.glob("*/metadata.json"):
            try:
                job_id = metadata_path.parent.name
                record = self.get_record(job_id)
                metadata = self.read_metadata(job_id)
                records.append(self.to_public_response(record, metadata))
            except (FileNotFoundError, json.JSONDecodeError, OSError):
                continue

        records.sort(key=lambda item: item.get("created_at", ""), reverse=True)
        return records[: max(1, limit)]

    def list_images(self, record: ConversionRecord) -> List[str]:
        if not record.images_dir.exists():
            return []

        return sorted(path.name for path in record.images_dir.glob("*.png"))

    def to_public_response(self, record: ConversionRecord, metadata: Dict) -> Dict:
        response = dict(metadata)
        response["files"] = {
            "input_pdf": record.input_pdf_path.name,
            "output_docx": record.output_docx_path.name,
            "images": metadata.get("files", {}).get("images", []),
        }
        response["links"] = {
            "details": f"/api/conversions/{record.job_id}",
            "input_pdf": f"/api/conversions/{record.job_id}/pdf",
            "output_docx": f"/api/conversions/{record.job_id}/docx",
            "images": f"/api/conversions/{record.job_id}/images",
        }
        return response


class ExcelPackageStorageService:
    def __init__(self, storage_root: Optional[Path] = None) -> None:
        configured_root = storage_root or Path(
            os.environ.get("EXCEL_PACKAGE_STORAGE_ROOT", "storage/excel_packages")
        )
        self.storage_root = configured_root.resolve()

    def _validate_job_id(self, job_id: str) -> str:
        normalized_job_id = str(job_id or "").strip()
        if not re.fullmatch(r"[0-9a-f]{32}", normalized_job_id):
            raise FileNotFoundError(f"Excel package not found: {job_id}")
        return normalized_job_id

    def create_record(self, original_filename: str) -> ExcelPackageRecord:
        job_id = uuid4().hex
        job_dir = self.storage_root / job_id
        input_docx_path = job_dir / "input.docx"
        package_zip_path = job_dir / "excel_upload_package.zip"
        metadata_path = job_dir / "metadata.json"

        job_dir.mkdir(parents=True, exist_ok=True)

        return ExcelPackageRecord(
            job_id=job_id,
            original_filename=original_filename,
            job_dir=job_dir,
            input_docx_path=input_docx_path,
            package_zip_path=package_zip_path,
            metadata_path=metadata_path,
        )

    def get_record(self, job_id: str) -> ExcelPackageRecord:
        job_id = self._validate_job_id(job_id)
        job_dir = self.storage_root / job_id
        metadata_path = job_dir / "metadata.json"

        if not metadata_path.exists():
            raise FileNotFoundError(f"Excel package not found: {job_id}")

        metadata = self.read_metadata(job_id)

        return ExcelPackageRecord(
            job_id=job_id,
            original_filename=metadata.get("original_filename", "questions.docx"),
            job_dir=job_dir,
            input_docx_path=job_dir / "input.docx",
            package_zip_path=job_dir / "excel_upload_package.zip",
            metadata_path=metadata_path,
        )

    def write_metadata(
        self,
        record: ExcelPackageRecord,
        status: str,
        source_type: str,
        class_id: str,
        subject_id: str,
        topic_id: str,
        difficulty: str,
        error: str = "",
    ) -> Dict:
        metadata = {
            "job_id": record.job_id,
            "status": status,
            "source_type": source_type,
            "original_filename": record.original_filename,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "class_id": class_id,
            "subject_id": subject_id,
            "topic_id": topic_id,
            "difficulty": difficulty,
            "files": {
                "input_docx": str(record.input_docx_path),
                "package_zip": str(record.package_zip_path),
            },
            "error": error,
        }

        record.metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
        return metadata

    def read_metadata(self, job_id: str) -> Dict:
        job_id = self._validate_job_id(job_id)
        metadata_path = self.storage_root / job_id / "metadata.json"
        return json.loads(metadata_path.read_text(encoding="utf-8"))

    def list_records(self, limit: int = 25) -> List[Dict]:
        if not self.storage_root.exists():
            return []

        records = []
        for metadata_path in self.storage_root.glob("*/metadata.json"):
            try:
                job_id = metadata_path.parent.name
                record = self.get_record(job_id)
                metadata = self.read_metadata(job_id)
                records.append(self.to_public_response(record, metadata))
            except (FileNotFoundError, json.JSONDecodeError, OSError):
                continue

        records.sort(key=lambda item: item.get("created_at", ""), reverse=True)
        return records[: max(1, limit)]

    def to_public_response(self, record: ExcelPackageRecord, metadata: Dict) -> Dict:
        response = dict(metadata)
        response["files"] = {
            "input_docx": record.input_docx_path.name,
            "package_zip": record.package_zip_path.name,
        }
        response["links"] = {
            "details": f"/api/excel-packages/{record.job_id}",
            "package_zip": f"/api/excel-packages/{record.job_id}/download",
        }
        return response
