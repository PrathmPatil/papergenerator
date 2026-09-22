import os


# Use 127.0.0.1 so Chrome does not hit IPv6 ::1 (common ERR_CONNECTION_REFUSED).
BASE_URL = os.getenv("E2E_BASE_URL", "http://127.0.0.1:3003").rstrip("/")
MASTER_EMAIL = os.getenv("E2E_EMAIL", "master@gmail.com")
MASTER_PASSWORD = os.getenv("E2E_PASSWORD", "Master@123")
HEADLESS = os.getenv("E2E_HEADLESS", "1").strip() not in {"0", "false", "False"}
IMPLICIT_WAIT = 0
EXPLICIT_WAIT = int(os.getenv("E2E_WAIT", "12"))
WINDOW_SIZE = os.getenv("E2E_WINDOW", "1440,900")
