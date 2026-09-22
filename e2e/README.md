# Selenium UI tests

Run these against a live app at `http://127.0.0.1:3003/` (backend on port 5000).

## Setup

```powershell
cd e2e
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Chrome must be installed. Selenium Manager downloads the matching ChromeDriver.

## Run

Keep frontend and backend running, then:

```powershell
cd e2e
.\.venv\Scripts\Activate.ps1
pytest
```

Headed browser:

```powershell
$env:E2E_HEADLESS="0"
pytest
```

HTML report:

```powershell
pytest --html=reports/report.html --self-contained-html
```

Only smoke tests:

```powershell
pytest -m smoke
```

Only negative cases:

```powershell
pytest -m negative
```

## Credentials

Defaults:

- URL: `http://127.0.0.1:3003`
- Email: `master@gmail.com`
- Password: `Master@123`

Override with `E2E_BASE_URL`, `E2E_EMAIL`, `E2E_PASSWORD`.

## Coverage

Positive and negative UI cases for:

- Login validation and successful master login
- Sidebar pages (Question Bank, Topics, Papers, converters, Users, Settings, Instructions)
- Guest cannot see staff navigation
- Topics add without details
- Question Bank bulk actions stay disabled with no selection
- Settings password update without values
- Paper generator next/fetch without a complete blueprint
- Sign out

The backend login route is rate-limited. If many failed/successful logins run in a short window, wait a few minutes and re-run, or run login tests separately:

```powershell
pytest tests/test_login.py
pytest --ignore=tests/test_login.py
```
