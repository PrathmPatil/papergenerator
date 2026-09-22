import pytest
from selenium.webdriver.common.by import By


@pytest.mark.smoke
@pytest.mark.positive
def test_question_bank_loads(logged_in):
    logged_in.nav("question-bank")
    logged_in.wait_for_path("/dashboard/questions")
    assert logged_in.heading_is("Question Bank")
    assert logged_in.visible((By.XPATH, "//button[contains(., 'Add Question')]"))
    assert logged_in.visible((By.CSS_SELECTOR, 'input[placeholder="Search question..."]'))


@pytest.mark.negative
def test_question_bank_bulk_actions_disabled_without_selection(logged_in):
    logged_in.nav("question-bank")
    logged_in.wait_for_path("/dashboard/questions")
    convert = logged_in.find((By.XPATH, "//button[contains(., 'Convert to Image MCQ')]"))
    bulk_edit = logged_in.find((By.XPATH, "//button[contains(., 'Bulk Edit')]"))
    assert convert.get_attribute("disabled")
    assert bulk_edit.get_attribute("disabled")


@pytest.mark.positive
def test_add_question_page_opens(logged_in):
    logged_in.nav("question-bank")
    logged_in.click((By.XPATH, "//button[contains(., 'Add Question')] | //a[contains(., 'Add Question')]"))
    logged_in.wait_for_path("/dashboard/questions/new")
    assert logged_in.heading_is("Create New Question")
    assert logged_in.page_contains("Text MCQ")
