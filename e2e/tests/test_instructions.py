import pytest
from selenium.webdriver.common.by import By


@pytest.mark.positive
def test_instructions_shows_formula_rules(logged_in):
    logged_in.nav("instructions")
    logged_in.wait_for_path("/dashboard/instructions")
    assert logged_in.heading_is("Instructions")
    assert logged_in.page_contains("If auto-convert is not enough, use braces")
    assert logged_in.page_contains("CO₂") or logged_in.page_contains("CO2")
    assert logged_in.page_contains("H_{2}O") or logged_in.page_contains("H₂O")
    assert logged_in.page_contains("Sample files")
    assert logged_in.visible((By.XPATH, "//button[contains(., 'Download')]"))


@pytest.mark.positive
def test_instructions_lists_class_and_subject_ids(logged_in):
    logged_in.nav("instructions")
    logged_in.wait_for_path("/dashboard/instructions")
    assert logged_in.page_contains("class_10")
    assert logged_in.page_contains("chemistry")
    assert logged_in.page_contains("Final review checklist")
