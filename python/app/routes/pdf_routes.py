from flask import Blueprint, jsonify, request, send_file
from werkzeug.utils import secure_filename

from app.services.conversion_storage_service import ConversionStorageService
from app.services.pdf_to_docx_service import PdfToDocxService


pdf_bp = Blueprint("pdf", __name__)
pdf_service = PdfToDocxService()
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
