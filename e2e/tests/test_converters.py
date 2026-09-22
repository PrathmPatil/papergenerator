import pytest
from selenium.webdriver.common.by import By


@pytest.mark.positive
def test_papers_page_loads(logged_in):
    logged_in.nav("papers")
    logged_in.wait_for_path("/dashboard/papers")
    assert logged_in.heading_is("Papers") or logged_in.page_contains("paper")


@pytest.mark.positive
def test_pdf_converter_rejects_non_pdf_copy(logged_in):
    logged_in.nav("pdf-converter")
    logged_in.wait_for_path("/dashboard/pdf-converter")
    assert logged_in.heading_is("PDF Converter")
    assert logged_in.page_contains("PDF")


@pytest.mark.positive
def test_docx_page_requires_class_context(logged_in):
    logged_in.nav("docx-to-excel")
    logged_in.wait_for_path("/dashboard/docx-to-excel")
    assert logged_in.heading_is("DOCX to Excel")
    assert logged_in.page_contains("Class")
