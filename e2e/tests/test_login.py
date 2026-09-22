import pytest
from selenium.webdriver.common.by import By

from config import MASTER_EMAIL, MASTER_PASSWORD


@pytest.mark.smoke
@pytest.mark.positive
def test_login_page_loads(login_page):
    login_page.open_login()
    assert login_page.visible(login_page.EMAIL)
    assert login_page.visible(login_page.SUBMIT)
    assert login_page.page_contains("Login")


@pytest.mark.negative
def test_login_empty_fields_shows_validation(login_page):
    login_page.open_login()
    login_page.click(login_page.SUBMIT)
    assert login_page.email_error()
    assert login_page.password_error()
    assert login_page.toast_or_body_contains("Validation Error", "Please fix the errors")


@pytest.mark.negative
def test_login_invalid_email_format(login_page):
    login_page.open_login()
    login_page.login("not-an-email", "Master@123")
    assert "/dashboard" not in login_page.driver.current_url
    assert login_page.visible(login_page.SUBMIT)


@pytest.mark.negative
def test_login_short_password(login_page):
    login_page.open_login()
    login_page.login(MASTER_EMAIL, "short")
    assert login_page.page_contains("Password must be at least 8 characters")
    assert "/dashboard" not in login_page.driver.current_url


@pytest.mark.negative
def test_login_wrong_password(login_page):
    login_page.open_login()
    login_page.login(MASTER_EMAIL, "WrongPass@123")
    login_page.wait.until(
        lambda driver: "Invalid email or password" in driver.page_source
        or "Login Failed" in driver.page_source
    )
    assert "/dashboard" not in login_page.driver.current_url


@pytest.mark.smoke
@pytest.mark.positive
def test_login_valid_master_opens_dashboard(login_page):
    login_page.open_login()
    login_page.login(MASTER_EMAIL, MASTER_PASSWORD)
    login_page.wait_for_path("/dashboard")
    assert login_page.visible((By.XPATH, "//h2[normalize-space()='Dashboard']"))
    assert login_page.visible((By.CSS_SELECTOR, '[data-testid="nav-question-bank"]'))


@pytest.mark.negative
def test_unknown_user_cannot_login(login_page):
    login_page.open_login()
    login_page.login("nobody@example.com", "NotAReal@123")
    login_page.wait.until(
        lambda driver: "Invalid email or password" in driver.page_source
        or "Login Failed" in driver.page_source
    )
    assert login_page.visible(login_page.SUBMIT)
