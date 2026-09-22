from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from config import BASE_URL, EXPLICIT_WAIT


class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, EXPLICIT_WAIT)

    def open(self, path="/"):
        self.driver.get(f"{BASE_URL}{path}")

    def find(self, locator):
        return self.wait.until(EC.presence_of_element_located(locator))

    def click(self, locator):
        self.wait.until(EC.element_to_be_clickable(locator)).click()

    def type(self, locator, value, clear=True):
        element = self.wait.until(EC.visibility_of_element_located(locator))
        if clear:
            element.clear()
        element.send_keys(value)
        return element

    def text_of(self, locator):
        return self.find(locator).text

    def visible(self, locator):
        try:
            self.wait.until(EC.visibility_of_element_located(locator))
            return True
        except TimeoutException:
            return False

    def page_contains(self, text):
        return text.lower() in self.driver.page_source.lower()

    def current_path(self):
        return self.driver.execute_script("return window.location.pathname")

    def wait_for_path(self, path):
        self.wait.until(lambda driver: path in driver.current_url)

    def toast_or_body_contains(self, *snippets):
        source = self.driver.page_source
        return any(snippet.lower() in source.lower() for snippet in snippets)

    def nav(self, slug):
        self.click((By.CSS_SELECTOR, f'[data-testid="nav-{slug}"]'))
