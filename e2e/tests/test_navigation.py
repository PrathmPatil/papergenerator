import pytest
from selenium.webdriver.common.by import By

from config import MASTER_EMAIL, MASTER_PASSWORD
from pages.app_page import AppPage


NAV_PAGES = [
    ("dashboard", "/dashboard", "Dashboard"),
    ("question-bank", "/dashboard/questions", "Question Bank"),
    ("topics", "/dashboard/topics", "Topics"),
    ("paper-generator", "/dashboard/generate", "Generate Paper"),
    ("papers", "/dashboard/papers", "Paper Bank"),
    ("pdf-converter", "/dashboard/pdf-converter", "PDF Converter"),
    ("docx-to-excel", "/dashboard/docx-to-excel", "DOCX to Excel"),
    ("user-management", "/dashboard/users", "User Management"),
    ("settings", "/dashboard/settings", "Settings"),
    ("instructions", "/dashboard/instructions", "Instructions"),
]


@pytest.mark.smoke
@pytest.mark.positive
@pytest.mark.parametrize("slug,path,heading", NAV_PAGES)
def test_sidebar_opens_each_page(logged_in, slug, path, heading):
    if slug != "dashboard":
        logged_in.nav(slug)
    logged_in.wait_for_path(path)
    assert logged_in.heading_is(heading)


@pytest.mark.negative
def test_guest_does_not_see_staff_navigation(login_page, app_page):
    login_page.open("/dashboard")
    assert not app_page.visible((By.CSS_SELECTOR, '[data-testid="nav-question-bank"]'))
    assert not app_page.visible((By.CSS_SELECTOR, '[data-testid="nav-user-management"]'))


@pytest.mark.positive
def test_sign_out_returns_to_login(driver, login_page):
    login_page.open_login()
    login_page.login(MASTER_EMAIL, MASTER_PASSWORD)
    login_page.wait_for_path("/dashboard")
    AppPage(driver).sign_out()
    assert login_page.visible(login_page.EMAIL)
