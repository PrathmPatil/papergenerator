import tempfile
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.conversion_storage_service import (
    ConversionRecord,
    ConversionStorageService,
)


class ConversionStorageServiceTest(unittest.TestCase):
    def test_rejects_non_uuid_hex_job_ids(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            service = ConversionStorageService(Path(temp_dir))

            with self.assertRaises(FileNotFoundError):
                service.get_record("..\\outside")

            with self.assertRaises(FileNotFoundError):
                service.read_metadata("not-a-job-id")

    def test_public_response_does_not_expose_storage_paths(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            job_id = "a" * 32
            job_dir = Path(temp_dir) / job_id
            record = ConversionRecord(
                job_id=job_id,
                original_filename="input.pdf",
                job_dir=job_dir,
                input_pdf_path=job_dir / "input.pdf",
                output_docx_path=job_dir / "output.docx",
                images_dir=job_dir / "images",
                metadata_path=job_dir / "metadata.json",
            )
            service = ConversionStorageService(Path(temp_dir))

            response = service.to_public_response(
                record,
                {
                    "job_id": record.job_id,
                    "status": "completed",
                    "files": {
                        "input_pdf": str(record.input_pdf_path),
                        "output_docx": str(record.output_docx_path),
                        "images_dir": str(record.images_dir),
                        "images": ["page_1_img_0.png"],
                    },
                },
            )

            self.assertEqual(response["files"]["input_pdf"], "input.pdf")
            self.assertEqual(response["files"]["output_docx"], "output.docx")
            self.assertNotIn("images_dir", response["files"])

    def test_list_records_returns_public_conversion_history(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            service = ConversionStorageService(Path(temp_dir))
            record = service.create_record("sample.pdf")
            service.write_metadata(record, status="completed", images=["page_1_img_0.png"])

            records = service.list_records()

            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["job_id"], record.job_id)
            self.assertEqual(records[0]["original_filename"], "sample.pdf")
            self.assertEqual(records[0]["files"]["images"], ["page_1_img_0.png"])


if __name__ == "__main__":
    unittest.main()
