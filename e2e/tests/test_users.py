import pytest
from selenium.webdriver.common.by import By


@pytest.mark.smoke
@pytest.mark.positive
def test_user_management_loads(logged_in):
    logged_in.nav("user-management")
    logged_in.wait_for_path("/dashboard/users")
    assert logged_in.heading_is("User Management")
    assert logged_in.visible((By.XPATH, "//button[contains(., 'Add New')]"))


@pytest.mark.negative
def test_add_user_empty_form_shows_validation(logged_in):
    logged_in.nav("user-management")
    logged_in.wait_for_path("/dashboard/users")
    logged_in.click((By.XPATH, "//button[contains(., 'Add New')]"))
    logged_in.visible((By.XPATH, "//*[contains(., 'Create a new teacher or student')]"))
    logged_in.click((By.XPATH, "//button[normalize-space()='Add User']"))
    assert logged_in.toast_or_body_contains("required", "Email is required", "Name is required")
