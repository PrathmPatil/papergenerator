# Python PDF Service Setup And AWS Docker Compose

This guide explains how to run the Python PDF conversion service locally and how to deploy it on an AWS EC2 server using Docker Compose.

## Local Python Setup

From the project root:

```powershell
cd python
```

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Set environment variables:

```powershell
$env:PDF_SERVICE_PORT="5001"
$env:FLASK_DEBUG="false"
$env:CONVERSION_STORAGE_ROOT="storage/conversions"
```

Run the service:

```powershell
python main.py
```

Test the service:

```powershell
curl.exe http://127.0.0.1:5001/api/health
```

Swagger UI:

```text
http://127.0.0.1:5001/swagger
```

## AWS EC2 Docker Compose Setup

SSH into your AWS EC2 Ubuntu server, then install Docker and Docker Compose:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

Clone the project:

```bash
git clone <your-repo-url> papergenerator
cd papergenerator
```

## Dockerfile

If `python/Dockerfile` does not exist, create it:

```bash
cat > python/Dockerfile <<'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PDF_SERVICE_PORT=5001
ENV FLASK_DEBUG=false
ENV CONVERSION_STORAGE_ROOT=/app/storage/conversions

EXPOSE 5001

CMD ["python", "main.py"]
EOF
```

## Docker Compose

Create `docker-compose.yml` in the project root:

```bash
cat > docker-compose.yml <<'EOF'
services:
  pdf-service:
    build:
      context: ./python
    container_name: papergenerator-pdf-service
    environment:
      PDF_SERVICE_PORT: 5001
      FLASK_DEBUG: "false"
      CONVERSION_STORAGE_ROOT: /app/storage/conversions
    ports:
      - "5001:5001"
    volumes:
      - pdf_conversion_storage:/app/storage
    restart: unless-stopped

volumes:
  pdf_conversion_storage:
EOF
```

Build and start the service:

```bash
docker compose up -d --build
```

Check running containers:

```bash
docker compose ps
```

Check logs:

```bash
docker compose logs -f pdf-service
```

Test the service on the server:

```bash
curl http://127.0.0.1:5001/api/health
```

## Backend Environment

If the Node backend runs directly on the same AWS server, use:

```env
PDF_SERVICE_BASE_URL=http://127.0.0.1:5001
```

If the Node backend also runs inside the same Docker Compose network, use:

```env
PDF_SERVICE_BASE_URL=http://pdf-service:5001
```

## Useful Commands

Restart the service:

```bash
docker compose restart pdf-service
```

Stop the service:

```bash
docker compose down
```

Rebuild after code changes:

```bash
docker compose up -d --build
```
