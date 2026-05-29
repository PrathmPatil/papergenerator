import tempfile
from pathlib import Path

from flask import Blueprint, jsonify, request, send_file
from werkzeug.utils import secure_filename

from app.services.conversion_storage_service import ConversionStorageService
from app.services.docx_to_excel_service import DocxExcelDefaults, DocxToExcelService
from app.services.pdf_to_docx_service import PdfToDocxService
from app.services.pdf_question_excel_service import PdfQuestionDefaults, PdfQuestionExcelService


pdf_bp = Blueprint("pdf", __name__)
pdf_service = PdfToDocxService()
docx_excel_service = DocxToExcelService()
pdf_question_excel_service = PdfQuestionExcelService()
storage_service = ConversionStorageService()


def has_pdf_signature(uploaded_file) -> bool:
    current_position = uploaded_file.stream.tell()
    uploaded_file.stream.seek(0)
    signature = uploaded_file.stream.read(5)
    uploaded_file.stream.seek(current_position)
    return signature == b"%PDF-"


@pdf_bp.get("/")
def upload_form():
    return """
    <!doctype html>
    <html>
      <head><title>PDF to DOCX Converter</title></head>
      <body>
        <h1>PDF to DOCX Converter</h1>
        <form action="/api/convert" method="post" enctype="multipart/form-data">
          <input type="file" name="pdf" accept="application/pdf" required>
          <button type="submit">Convert</button>
        </form>
      </body>
    </html>
    """


@pdf_bp.get("/api/health")
def health_check():
    return jsonify({"status": "ok"})


def parse_int_form(name: str, default: int) -> int:
    try:
        return int(request.form.get(name, str(default)) or default)
    except (TypeError, ValueError):
        return default


def parse_float_form(name: str, default: float) -> float:
    try:
        return float(request.form.get(name, str(default)) or default)
    except (TypeError, ValueError):
        return default


@pdf_bp.post("/api/pdf-to-excel")
def convert_pdf_questions_to_excel():
    uploaded_files = request.files.getlist("pdfs")

    if not uploaded_files:
        single_file = request.files.get("pdf")
        uploaded_files = [single_file] if single_file else []

    uploaded_files = [file for file in uploaded_files if file and file.filename]
    if not uploaded_files:
        return jsonify({"error": "Upload one or more PDF files using the 'pdfs' form field."}), 400

    class_id = request.form.get("classId", "").strip()
    subject_id = request.form.get("subjectId", "").strip()
    if not class_id or not subject_id:
        return jsonify({"error": "classId and subjectId are required."}), 400

    defaults = PdfQuestionDefaults(
        class_id=class_id,
        subject_id=subject_id,
        difficulty=request.form.get("difficulty", "easy").strip() or "easy",
        marks=parse_int_form("marks", 1),
        negative_marks=parse_float_form("negativeMarks", 0),
    )

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            pdf_paths = []
            for uploaded_file in uploaded_files:
                filename = secure_filename(uploaded_file.filename)
                if not filename or not filename.lower().endswith(".pdf"):
                    return jsonify({"error": f"Only PDF files are supported: {uploaded_file.filename}"}), 400

                if not has_pdf_signature(uploaded_file):
                    return jsonify({"error": f"Uploaded file is not a valid PDF: {uploaded_file.filename}"}), 400

                pdf_path = Path(temp_dir) / filename
                uploaded_file.save(pdf_path)
                pdf_paths.append(pdf_path)

            zip_buffer = pdf_question_excel_service.generate_excel_zip(pdf_paths, defaults)
    except Exception:
        return jsonify({"error": "PDF question Excel generation failed."}), 500

    download_name = f"{class_id}_{subject_id}_QuestionExcelFiles.zip"
    return send_file(
        zip_buffer,
        as_attachment=True,
        download_name=download_name,
        mimetype="application/zip",
    )


@pdf_bp.post("/api/docx-to-excel")
def convert_docx_to_excel():
    uploaded_file = request.files.get("docx")

    if uploaded_file is None or uploaded_file.filename == "":
        return jsonify({"error": "Upload a DOCX file using the 'docx' form field."}), 400

    filename = secure_filename(uploaded_file.filename)
    if filename == "":
        return jsonify({"error": "Upload a DOCX file with a valid filename."}), 400

    if not filename.lower().endswith(".docx"):
        return jsonify({"error": "Only DOCX files are supported."}), 400

    defaults = DocxExcelDefaults(
        class_id=request.form.get("classId", "").strip(),
        subject_id=request.form.get("subjectId", "").strip(),
        topic_name=request.form.get("topicName", "").strip(),
        difficulty=request.form.get("difficulty", "easy").strip() or "easy",
        marks=parse_int_form("marks", 1),
        negative_marks=parse_float_form("negativeMarks", 0),
    )

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / filename
            uploaded_file.save(input_path)
            zip_buffer = docx_excel_service.convert_to_zip(input_path, defaults)
    except Exception:
        return jsonify({"error": "DOCX to Excel segregation failed."}), 500

    download_name = f"{Path(filename).stem}-excel-import-files.zip"
    return send_file(
        zip_buffer,
        as_attachment=True,
        download_name=download_name,
        mimetype="application/zip",
    )


@pdf_bp.post("/api/convert")
def convert_pdf():
    uploaded_file = request.files.get("pdf")

    if uploaded_file is None or uploaded_file.filename == "":
        return jsonify({"error": "Upload a PDF file using the 'pdf' form field."}), 400

    filename = secure_filename(uploaded_file.filename)
    if filename == "":
        return jsonify({"error": "Upload a PDF file with a valid filename."}), 400

    if not filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported."}), 400

    if not has_pdf_signature(uploaded_file):
        return jsonify({"error": "Uploaded file is not a valid PDF."}), 400

    record = storage_service.create_record(filename)

    try:
        uploaded_file.save(record.input_pdf_path)
        pdf_service.convert(
            record.input_pdf_path,
            record.output_docx_path,
            image_dir=record.images_dir,
        )
        image_names = storage_service.list_images(record)
        metadata = storage_service.write_metadata(record, status="completed", images=image_names)
    except Exception as exc:
        storage_service.write_metadata(record, status="failed", images=[], error=str(exc))
        return jsonify({"error": "Conversion failed."}), 500

    return jsonify(storage_service.to_public_response(record, metadata)), 201


@pdf_bp.get("/api/conversions")
def list_conversions():
    try:
        limit = int(request.args.get("limit", "25"))
    except ValueError:
        limit = 25

    return jsonify({"conversions": storage_service.list_records(limit=limit)})


@pdf_bp.get("/api/conversions/<job_id>")
def get_conversion(job_id):
    try:
        record = storage_service.get_record(job_id)
        metadata = storage_service.read_metadata(job_id)
    except FileNotFoundError:
        return jsonify({"error": "Conversion not found."}), 404

    return jsonify(storage_service.to_public_response(record, metadata))


@pdf_bp.get("/api/conversions/<job_id>/pdf")
def download_input_pdf(job_id):
    try:
        record = storage_service.get_record(job_id)
    except FileNotFoundError:
        return jsonify({"error": "Conversion not found."}), 404

    if not record.input_pdf_path.exists():
        return jsonify({"error": "Input PDF not found."}), 404

    return send_file(record.input_pdf_path, as_attachment=True, download_name=record.original_filename)


@pdf_bp.get("/api/conversions/<job_id>/docx")
def download_output_docx(job_id):
    try:
        record = storage_service.get_record(job_id)
    except FileNotFoundError:
        return jsonify({"error": "Conversion not found."}), 404

    if not record.output_docx_path.exists():
        return jsonify({"error": "Output DOCX not found."}), 404

    return send_file(
        record.output_docx_path,
        as_attachment=True,
        download_name=f"{record.job_id}.docx",
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@pdf_bp.get("/api/conversions/<job_id>/images")
def list_conversion_images(job_id):
    try:
        record = storage_service.get_record(job_id)
    except FileNotFoundError:
        return jsonify({"error": "Conversion not found."}), 404

    images = storage_service.list_images(record)
    return jsonify(
        {
            "job_id": job_id,
            "images": [
                {
                    "name": image_name,
                    "url": f"/api/conversions/{job_id}/images/{image_name}",
                }
                for image_name in images
            ],
        }
    )


@pdf_bp.get("/api/conversions/<job_id>/images/<image_name>")
def download_conversion_image(job_id, image_name):
    try:
        record = storage_service.get_record(job_id)
    except FileNotFoundError:
        return jsonify({"error": "Conversion not found."}), 404

    safe_image_name = secure_filename(image_name)
    image_path = record.images_dir / safe_image_name

    if safe_image_name != image_name or not image_path.exists():
        return jsonify({"error": "Image not found."}), 404

    return send_file(image_path, as_attachment=True, download_name=safe_image_name)
