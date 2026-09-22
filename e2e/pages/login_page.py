from selenium.webdriver.common.by import By

from pages.base_page import BasePage


class LoginPage(BasePage):
    EMAIL = (By.CSS_SELECTOR, '[data-testid="login-email"]')
    PASSWORD = (By.CSS_SELECTOR, '[data-testid="login-password"]')
    SUBMIT = (By.CSS_SELECTOR, '[data-testid="login-submit"]')
    TITLE = (By.XPATH, "//h3[normalize-space()='Login'] | //*[@data-slot='card-title' and contains(., 'Login')]")

    def open_login(self):
        self.open("/")
        self.find(self.EMAIL)
        return self

    def login(self, email, password):
        self.type(self.EMAIL, email)
        self.type(self.PASSWORD, password)
        self.click(self.SUBMIT)
        return self

    def email_error(self):
        return self.page_contains("Email is required") or self.page_contains("Invalid email address")

    def password_error(self):
        return self.page_contains("Password is required") or self.page_contains(
            "Password must be at least 8 characters"
        )
