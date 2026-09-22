import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys


@pytest.mark.smoke
@pytest.mark.positive
def test_topics_page_loads(logged_in):
    logged_in.nav("topics")
    logged_in.wait_for_path("/dashboard/topics")
    assert logged_in.heading_is("Topics")
    assert logged_in.visible((By.CSS_SELECTOR, '[data-testid="topic-add-button"]'))


@pytest.mark.negative
def test_add_topic_without_details_shows_error(logged_in):
    logged_in.nav("topics")
    logged_in.wait_for_path("/dashboard/topics")
    logged_in.click((By.CSS_SELECTOR, '[data-testid="topic-add-button"]'))
    assert logged_in.toast_or_body_contains(
        "Topic details required",
        "Select class, select subject, then enter the topic name",
    )


@pytest.mark.positive
def test_topic_search_field_accepts_input(logged_in):
    logged_in.nav("topics")
    search = logged_in.find((By.CSS_SELECTOR, 'input[placeholder="Search topic"]'))
    search.clear()
    search.send_keys("Atoms")
    search.send_keys(Keys.ENTER)
    assert search.get_attribute("value") == "Atoms"
