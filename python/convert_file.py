import argparse

from app.services.pdf_to_docx_service import PdfToDocxService


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert a PDF file to DOCX.")
    parser.add_argument("input_pdf", help="Path to the input PDF file.")
    parser.add_argument(
        "-o",
        "--output",
        default="converted.docx",
        help="Path for the generated DOCX file.",
    )
    args = parser.parse_args()

    output_path = PdfToDocxService().convert(args.input_pdf, args.output)
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    main()
