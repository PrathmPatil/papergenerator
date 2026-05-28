from flask import jsonify
from flask_swagger_ui import get_swaggerui_blueprint


SWAGGER_URL = "/swagger"
API_URL = "/swagger.json"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def create_swagger_blueprint():
    return get_swaggerui_blueprint(
        SWAGGER_URL,
        API_URL,
        config={"app_name": "PDF to DOCX Converter API"},
    )


def error_response(description):
    return {
        "description": description,
        "content": {
            "application/json": {
                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
            }
        },
    }


def job_id_parameter():
    return {
        "name": "job_id",
        "in": "path",
        "required": True,
        "schema": {"type": "string"},
        "description": "Conversion job ID returned by POST /api/convert.",
    }


def register_swagger_routes(app):
    app.register_blueprint(create_swagger_blueprint(), url_prefix=SWAGGER_URL)

    @app.get(API_URL)
    def swagger_json():
        return jsonify(
            {
                "openapi": "3.0.3",
                "info": {
                    "title": "PDF to DOCX Converter API",
                    "version": "1.0.0",
                    "description": "Upload a PDF, store extracted files/images locally, and download them by job ID.",
                },
                "servers": [{"url": "http://127.0.0.1:5001"}],
                "paths": {
                    "/api/health": {
                        "get": {
                            "summary": "Health check",
                            "tags": ["Health"],
                            "responses": {
                                "200": {
                                    "description": "Server is running",
                                    "content": {
                                        "application/json": {
                                            "schema": {
                                                "type": "object",
                                                "properties": {
                                                    "status": {"type": "string", "example": "ok"}
                                                },
                                            }
                                        }
                                    },
                                }
                            },
                        }
                    },
                    "/api/convert": {
                        "post": {
                            "summary": "Convert and store PDF assets",
                            "description": "Upload a PDF using multipart/form-data. The API stores the input PDF, generated DOCX, extracted images, and metadata locally.",
                            "tags": ["PDF Conversion"],
                            "requestBody": {
                                "required": True,
                                "content": {
                                    "multipart/form-data": {
                                        "schema": {
                                            "type": "object",
                                            "required": ["pdf"],
                                            "properties": {
                                                "pdf": {
                                                    "type": "string",
                                                    "format": "binary",
                                                    "description": "PDF file to convert.",
                                                }
                                            },
                                        }
                                    }
                                },
                            },
                            "responses": {
                                "201": {
                                    "description": "Conversion completed and files stored",
                                    "content": {
                                        "application/json": {
                                            "schema": {"$ref": "#/components/schemas/ConversionResponse"}
                                        }
                                    },
                                },
                                "400": error_response("Invalid upload"),
                                "500": error_response("Conversion failed"),
                            },
                        }
                    },
                    "/api/conversions/{job_id}": {
                        "get": {
                            "summary": "Get conversion metadata",
                            "tags": ["Stored Files"],
                            "parameters": [job_id_parameter()],
                            "responses": {
                                "200": {
                                    "description": "Stored conversion metadata",
                                    "content": {
                                        "application/json": {
                                            "schema": {"$ref": "#/components/schemas/ConversionResponse"}
                                        }
                                    },
                                },
                                "404": error_response("Conversion not found"),
                            },
                        }
                    },
                    "/api/conversions/{job_id}/pdf": {
                        "get": {
                            "summary": "Download original uploaded PDF",
                            "tags": ["Stored Files"],
                            "parameters": [job_id_parameter()],
                            "responses": {
                                "200": {
                                    "description": "Original PDF",
                                    "content": {
                                        "application/pdf": {
                                            "schema": {"type": "string", "format": "binary"}
                                        }
                                    },
                                },
                                "404": error_response("PDF not found"),
                            },
                        }
                    },
                    "/api/conversions/{job_id}/docx": {
                        "get": {
                            "summary": "Download generated DOCX",
                            "tags": ["Stored Files"],
                            "parameters": [job_id_parameter()],
                            "responses": {
                                "200": {
                                    "description": "Generated DOCX file",
                                    "content": {
                                        DOCX_MIME: {
                                            "schema": {"type": "string", "format": "binary"}
                                        }
                                    },
                                },
                                "404": error_response("DOCX not found"),
                            },
                        }
                    },
                    "/api/conversions/{job_id}/images": {
                        "get": {
                            "summary": "List extracted images",
                            "tags": ["Stored Files"],
                            "parameters": [job_id_parameter()],
                            "responses": {
                                "200": {
                                    "description": "Extracted image list",
                                    "content": {
                                        "application/json": {
                                            "schema": {"$ref": "#/components/schemas/ImageListResponse"}
                                        }
                                    },
                                },
                                "404": error_response("Conversion not found"),
                            },
                        }
                    },
                    "/api/conversions/{job_id}/images/{image_name}": {
                        "get": {
                            "summary": "Download extracted image",
                            "tags": ["Stored Files"],
                            "parameters": [
                                job_id_parameter(),
                                {
                                    "name": "image_name",
                                    "in": "path",
                                    "required": True,
                                    "schema": {"type": "string"},
                                    "description": "Image filename returned by the image list endpoint.",
                                },
                            ],
                            "responses": {
                                "200": {
                                    "description": "Extracted PNG image",
                                    "content": {
                                        "image/png": {
                                            "schema": {"type": "string", "format": "binary"}
                                        }
                                    },
                                },
                                "404": error_response("Image not found"),
                            },
                        }
                    },
                },
                "components": {
                    "schemas": {
                        "ConversionResponse": {
                            "type": "object",
                            "properties": {
                                "job_id": {"type": "string"},
                                "status": {"type": "string", "example": "completed"},
                                "original_filename": {"type": "string", "example": "5.pdf"},
                                "created_at": {"type": "string", "format": "date-time"},
                                "files": {
                                    "type": "object",
                                    "properties": {
                                        "input_pdf": {"type": "string"},
                                        "output_docx": {"type": "string"},
                                        "images_dir": {"type": "string"},
                                        "images": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                    },
                                },
                                "links": {
                                    "type": "object",
                                    "properties": {
                                        "details": {"type": "string"},
                                        "input_pdf": {"type": "string"},
                                        "output_docx": {"type": "string"},
                                        "images": {"type": "string"},
                                    },
                                },
                            },
                        },
                        "ImageListResponse": {
                            "type": "object",
                            "properties": {
                                "job_id": {"type": "string"},
                                "images": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "name": {"type": "string"},
                                            "url": {"type": "string"},
                                        },
                                    },
                                },
                            },
                        },
                        "ErrorResponse": {
                            "type": "object",
                            "properties": {
                                "error": {
                                    "type": "string",
                                    "example": "Only PDF files are supported.",
                                }
                            },
                        },
                    }
                },
            }
        )
