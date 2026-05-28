from app import create_app
import os


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PDF_SERVICE_PORT", "5001"))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="127.0.0.1", port=port, debug=debug)
