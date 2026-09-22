from selenium.webdriver.common.by import By

from pages.base_page import BasePage


class AppPage(BasePage):
    SIGN_OUT = (By.XPATH, "//button[contains(., 'Sign Out')]")
    CONFIRM_SIGN_OUT = (By.XPATH, "//button[contains(., 'Yes, Sign Out')]")
    DASHBOARD_HEADING = (By.XPATH, "//h2[normalize-space()='Dashboard']")

    def heading_is(self, text):
        return self.visible((By.XPATH, f"//h1[contains(., '{text}')] | //h2[contains(., '{text}')]"))

    def sign_out(self):
        self.click(self.SIGN_OUT)
        self.click(self.CONFIRM_SIGN_OUT)
        self.find((By.CSS_SELECTOR, '[data-testid="login-email"]'))
