import pytest
from selenium.webdriver.common.by import By


@pytest.mark.smoke
@pytest.mark.positive
def test_settings_page_loads(logged_in):
    logged_in.nav("settings")
    logged_in.wait_for_path("/dashboard/settings")
    assert logged_in.page_contains("Change Password")
    assert logged_in.visible((By.CSS_SELECTOR, '[data-testid="update-password-button"]'))


@pytest.mark.negative
def test_update_password_without_values_shows_errors(logged_in):
    logged_in.nav("settings")
    logged_in.wait_for_path("/dashboard/settings")
    logged_in.click((By.CSS_SELECTOR, '[data-testid="update-password-button"]'))
    assert logged_in.toast_or_body_contains(
        "Current password",
        "New password must be at least 8 characters",
        "required",
    )
