import pytest
from selenium.webdriver.common.by import By


@pytest.mark.smoke
@pytest.mark.positive
def test_generate_paper_page_loads(logged_in):
    logged_in.nav("paper-generator")
    logged_in.wait_for_path("/dashboard/generate")
    assert logged_in.heading_is("Generate Paper")
    assert logged_in.visible((By.CSS_SELECTOR, 'input[placeholder="e.g. Half Yearly Examination 2023"]'))
    assert logged_in.visible((By.XPATH, "//button[contains(., 'Next')]"))


@pytest.mark.positive
def test_generate_paper_can_move_to_next_step(logged_in):
    logged_in.nav("paper-generator")
    title = logged_in.find((By.CSS_SELECTOR, 'input[placeholder="e.g. Half Yearly Examination 2023"]'))
    title.clear()
    title.send_keys("Selenium Smoke Paper")
    logged_in.click((By.XPATH, "//button[contains(., 'Next')]"))
    assert logged_in.page_contains("Blueprint Summary") or logged_in.page_contains("Configure")


@pytest.mark.negative
def test_fetch_questions_without_setup_is_blocked(logged_in):
    logged_in.nav("paper-generator")
    logged_in.click((By.XPATH, "//button[contains(., 'Next')]"))
    logged_in.click((By.XPATH, "//button[contains(., 'Next')]"))
    fetch = logged_in.driver.find_elements(By.XPATH, "//button[contains(., 'Fetch Questions')]")
    if fetch and fetch[0].is_displayed():
        fetch[0].click()
        assert logged_in.toast_or_body_contains("Validation required", "Please")
    else:
        assert logged_in.page_contains("Generate Paper")
