# PDF to DOCX Converter

This project converts an uploaded PDF into a DOCX file while keeping the server routes separate from the conversion business logic.

## Project Structure

```text
app/
  routes/
    pdf_routes.py              # HTTP routes
  services/
    conversion_storage_service.py # Local storage and metadata helpers
    pdf_to_docx_service.py     # PDF conversion business logic
  swagger.py                   # Swagger/OpenAPI documentation
convert_file.py                # CLI for testing conversion without server
main.py                        # Flask server entry point
requirements.txt               # Python dependencies
storage/                       # Generated after API upload; stores conversion jobs
```

## Install

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If your PowerShell blocks activation, run the venv Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Run Server

```powershell
.\.venv\Scripts\python.exe main.py
```

Open `http://127.0.0.1:5001` in your browser and upload a PDF.

## Swagger Upload

Open Swagger UI:

```text
http://127.0.0.1:5001/swagger
```

Then:

1. Open `POST /api/convert`.
2. Click `Try it out`.
3. Choose a PDF file in the `pdf` upload field.
4. Click `Execute`.
5. Copy the returned `job_id`.
6. Use the stored file APIs to download the DOCX, original PDF, or extracted images.

## Local Storage

For PDFs, DOCX files, and images, local file storage is easier than storing file content as strings in MongoDB.

The app stores each upload like this:

```text
storage/
  conversions/
    <job_id>/
      input.pdf
      output.docx
      metadata.json
      images/
        page_1_img_0.png
        page_2_img_1.png
```

MongoDB is still useful for metadata, for example `job_id`, status, original filename, user ID, and file paths. Avoid storing large files as base64 strings in MongoDB because it increases size and MongoDB documents have a 16 MB limit. If you must store files inside MongoDB, use GridFS instead.

## Test Business Logic Without Server

```powershell
.\.venv\Scripts\python.exe convert_file.py 5.pdf -o converted.docx
```

## API Routes

- `GET /` shows a simple upload form.
- `GET /swagger` shows Swagger UI.
- `GET /swagger.json` returns the OpenAPI spec.
- `GET /api/health` returns server health.
- `POST /api/convert` accepts a PDF file, stores the generated files locally, and returns a `job_id`.
- `GET /api/conversions/<job_id>` returns stored conversion metadata.
- `GET /api/conversions/<job_id>/pdf` downloads the original uploaded PDF.
- `GET /api/conversions/<job_id>/docx` downloads the generated DOCX.
- `GET /api/conversions/<job_id>/images` lists extracted images.
- `GET /api/conversions/<job_id>/images/<image_name>` downloads one extracted image.

Example with curl:

```powershell
curl.exe -X POST -F "pdf=@5.pdf" http://127.0.0.1:5001/api/convert
```
