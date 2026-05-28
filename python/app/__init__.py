from flask import Flask
from werkzeug.exceptions import RequestEntityTooLarge

from app.routes.pdf_routes import pdf_bp
from app.swagger import register_swagger_routes


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

    app.register_blueprint(pdf_bp)
    register_swagger_routes(app)

    @app.errorhandler(RequestEntityTooLarge)
    def handle_large_upload(_error):
        return {"error": "Uploaded file is too large."}, 413

    return app
