from pathlib import Path
import tempfile
from urllib.error import URLError
from urllib.request import urlopen

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

from config import BASE_URL, HEADLESS, MASTER_EMAIL, MASTER_PASSWORD, WINDOW_SIZE
from pages.app_page import AppPage
from pages.login_page import LoginPage

ROOT = Path(__file__).resolve().parent
SCREENSHOTS = ROOT / "screenshots"
REPORTS = ROOT / "reports"


def make_chrome():
    SCREENSHOTS.mkdir(exist_ok=True)
    REPORTS.mkdir(exist_ok=True)

    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--remote-allow-origins=*")
    options.add_argument(f"--window-size={WINDOW_SIZE}")
    options.add_argument("--lang=en-US")
    options.add_argument(f"--user-data-dir={tempfile.mkdtemp(prefix='pg-e2e-')}")

    browser = webdriver.Chrome(options=options)
    browser.set_page_load_timeout(60)
    return browser


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


def pytest_sessionstart(session):
    try:
        with urlopen(f"{BASE_URL}/", timeout=8) as response:
            if response.status >= 500:
                raise URLError(f"status {response.status}")
    except Exception as exc:
        pytest.exit(
            f"App is not reachable at {BASE_URL} ({exc}). "
            "Start the frontend on port 3003 (and backend on 5000), then re-run pytest. "
            "Do not point E2E_BASE_URL at a dead tunnel.",
            returncode=1,
        )


@pytest.fixture(scope="session")
def driver():
    browser = make_chrome()
    yield browser
    browser.quit()


@pytest.fixture
def login_page(driver):
    driver.get(f"{BASE_URL}/")
    driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
    page = LoginPage(driver)
    page.open_login()
    return page


@pytest.fixture
def app_page(driver):
    return AppPage(driver)


def _is_authenticated(driver):
    try:
        driver.find_element(By.CSS_SELECTOR, '[data-testid="nav-dashboard"]')
        return True
    except Exception:
        return False


@pytest.fixture
def logged_in(driver):
    page = AppPage(driver)
    page.open("/dashboard")
    if not _is_authenticated(driver):
        login = LoginPage(driver)
        login.open_login()
        login.login(MASTER_EMAIL, MASTER_PASSWORD)
        login.wait_for_path("/dashboard")
    return page


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when != "call" or report.passed:
        return
    driver = item.funcargs.get("driver")
    if not driver:
        return
    SCREENSHOTS.mkdir(exist_ok=True)
    safe_name = item.name.replace("/", "_").replace("\\", "_")[:120]
    driver.save_screenshot(str(SCREENSHOTS / f"{safe_name}.png"))
