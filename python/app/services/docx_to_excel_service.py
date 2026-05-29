from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Sequence

from docx import Document
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill


QUESTION_PATTERN = re.compile(r"^\s*(?:q(?:uestion)?\.?\s*)?(\d{1,4})[\).:\-]\s*(.+)$", re.IGNORECASE)
OPTION_PATTERN = re.compile(r"^\s*([A-Ea-e])[\).:\-]\s*(.+)$")


@dataclass(frozen=True)
class DocxExcelDefaults:
    class_id: str = ""
    subject_id: str = ""
    topic_name: str = ""
    difficulty: str = "easy"
    marks: int = 1
    negative_marks: float = 0


class DocxToExcelService:
    def convert_to_zip(self, docx_path: Path, defaults: DocxExcelDefaults) -> BytesIO:
        lines = self._read_docx_lines(docx_path)
        questions = self._parse_questions(lines)
        image_files = self._extract_images(docx_path)

        mcq_rows = self._build_mcq_rows(questions, defaults)
        paragraph_rows = self._build_paragraph_rows(questions, defaults)

        output = BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
            package.writestr(
                "mcq_text_questions.xlsx",
                self._build_workbook(
                    [
                        "classId",
                        "subjectId",
                        "topicName",
                        "difficulty",
                        "type",
                        "text",
                        "optionA",
                        "optionB",
                        "optionC",
                        "optionD",
                        "optionE",
                        "correctAnswer",
                        "marks",
                        "negativeMarks",
                    ],
                    mcq_rows,
                ),
            )
            package.writestr(
                "paragraph_questions.xlsx",
                self._build_workbook(
                    [
                        "classId",
                        "subjectId",
                        "topicName",
                        "difficulty",
                        "question_type",
                        "paragraph_group_id",
                        "instruction_text",
                        "paragraph",
                        "sub_question_id",
                        "sub_question_type",
                        "sub_question_text",
                        "option_A",
                        "option_B",
                        "option_C",
                        "option_D",
                        "correct_answer",
                        "marks",
                        "negative_marks",
                    ],
                    paragraph_rows,
                ),
            )
            package.writestr(
                "mcq_image_questions.xlsx",
                self._build_workbook(
                    [
                        "classId",
                        "subjectId",
                        "topicName",
                        "difficulty",
                        "type",
                        "questionText",
                        "questionImage",
                        "optionAText",
                        "optionAImage",
                        "optionBText",
                        "optionBImage",
                        "optionCText",
                        "optionCImage",
                        "optionDText",
                        "optionDImage",
                        "correctAnswer",
                        "marks",
                        "negativeMarks",
                    ],
                    [],
                ),
            )
            package.writestr(
                "image_subquestions.xlsx",
                self._build_workbook(
                    [
                        "classId",
                        "subjectId",
                        "topicName",
                        "difficulty",
                        "type",
                        "question_group_id",
                        "instructionText",
                        "questionImage",
                        "subQuestionId",
                        "subQuestionText",
                        "optionAText",
                        "optionBText",
                        "optionCText",
                        "optionDText",
                        "correctAnswer",
                        "marks",
                        "negativeMarks",
                    ],
                    [],
                ),
            )
            package.writestr(
                "image_reference.xlsx",
                self._build_workbook(
                    ["imageName", "notes"],
                    [[name, "Review and copy this imageName into the image Excel template if required."] for name in image_files],
                ),
            )
            package.writestr("images.zip", self._build_images_zip(image_files).getvalue())
            package.writestr("README.txt", self._build_readme(len(mcq_rows), len(paragraph_rows), len(image_files)))

        output.seek(0)
        return output

    def _read_docx_lines(self, docx_path: Path) -> List[str]:
        document = Document(str(docx_path))
        lines: List[str] = []

        for paragraph in document.paragraphs:
            text = self._clean_text(paragraph.text)
            if text:
                lines.append(text)

        for table in document.tables:
            for row in table.rows:
                cells = [self._clean_text(cell.text) for cell in row.cells]
                line = " ".join(cell for cell in cells if cell)
                if line:
                    lines.append(line)

        return lines

    def _parse_questions(self, lines: Sequence[str]) -> List[Dict]:
        questions: List[Dict] = []
        current = None
        passage_lines: List[str] = []
        active_passage = ""

        def flush_current() -> None:
            nonlocal current
            if current:
                current["text"] = self._clean_text(" ".join(current["question_lines"]))
                questions.append(current)
                current = None

        for line in lines:
            question_match = QUESTION_PATTERN.match(line)
            option_match = OPTION_PATTERN.match(line)

            if question_match:
                flush_current()
                if passage_lines and len(" ".join(passage_lines)) >= 140:
                    active_passage = self._clean_text("\n".join(passage_lines))
                passage_lines = []
                current = {
                    "number": question_match.group(1),
                    "question_lines": [question_match.group(2)],
                    "options": {},
                    "passage": active_passage,
                }
                continue

            if current and option_match:
                option_key = option_match.group(1).upper()
                current["options"][option_key] = self._clean_text(option_match.group(2))
                continue

            if current:
                current["question_lines"].append(line)
                continue

            passage_lines.append(line)

        flush_current()
        return [question for question in questions if question.get("text")]

    def _build_mcq_rows(self, questions: Sequence[Dict], defaults: DocxExcelDefaults) -> List[List]:
        rows: List[List] = []
        for question in questions:
            options = question.get("options") or {}
            if question.get("passage") or len(options) < 2:
                continue

            rows.append(
                [
                    defaults.class_id,
                    defaults.subject_id,
                    defaults.topic_name,
                    defaults.difficulty,
                    "mcq_text",
                    question.get("text", ""),
                    options.get("A", ""),
                    options.get("B", ""),
                    options.get("C", ""),
                    options.get("D", ""),
                    options.get("E", ""),
                    "",
                    defaults.marks,
                    defaults.negative_marks,
                ]
            )
        return rows

    def _build_paragraph_rows(self, questions: Sequence[Dict], defaults: DocxExcelDefaults) -> List[List]:
        rows: List[List] = []
        passage_indexes: Dict[str, int] = {}

        for question in questions:
            passage = question.get("passage") or ""
            options = question.get("options") or {}
            if not passage:
                continue

            if passage not in passage_indexes:
                passage_indexes[passage] = len(passage_indexes) + 1

            group_id = f"P{passage_indexes[passage]}"
            rows.append(
                [
                    defaults.class_id,
                    defaults.subject_id,
                    defaults.topic_name,
                    defaults.difficulty,
                    "paragraph",
                    group_id,
                    "Read the passage and answer the following questions.",
                    passage,
                    question.get("number", ""),
                    "mcq" if len(options) >= 2 else "short_answer",
                    question.get("text", ""),
                    options.get("A", ""),
                    options.get("B", ""),
                    options.get("C", ""),
                    options.get("D", ""),
                    "",
                    defaults.marks,
                    defaults.negative_marks,
                ]
            )
        return rows

    def _extract_images(self, docx_path: Path) -> Dict[str, bytes]:
        images: Dict[str, bytes] = {}
        with zipfile.ZipFile(docx_path, "r") as docx_zip:
            for name in docx_zip.namelist():
                if not name.startswith("word/media/"):
                    continue
                original_name = Path(name).name
                if not original_name:
                    continue
                safe_name = f"images/{original_name}"
                images[safe_name] = docx_zip.read(name)
        return images

    def _build_images_zip(self, image_files: Dict[str, bytes]) -> BytesIO:
        output = BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as images_zip:
            for name, content in image_files.items():
                images_zip.writestr(name, content)
        output.seek(0)
        return output

    def _build_workbook(self, headers: List[str], rows: List[List]) -> bytes:
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Questions"

        header_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")

        for column_index, header in enumerate(headers, 1):
            cell = sheet.cell(row=1, column=column_index, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            sheet.column_dimensions[cell.column_letter].width = max(14, min(42, len(header) + 4))

        for row_index, row in enumerate(rows, 2):
            for column_index, value in enumerate(row, 1):
                cell = sheet.cell(row=row_index, column=column_index, value=value)
                cell.alignment = Alignment(vertical="top", wrap_text=True)

        sheet.freeze_panes = "A2"
        output = BytesIO()
        workbook.save(output)
        return output.getvalue()

    def _build_readme(self, mcq_count: int, paragraph_count: int, image_count: int) -> str:
        return (
            "DOCX to Excel segregation result\n\n"
            f"Text MCQ rows: {mcq_count}\n"
            f"Paragraph rows: {paragraph_count}\n"
            f"Extracted images: {image_count}\n\n"
            "Important review notes:\n"
            "- Fill the correctAnswer/correct_answer column before importing.\n"
            "- Review classId, subjectId, topicName, marks, and negativeMarks.\n"
            "- Image mapping is not guessed automatically. Use image_reference.xlsx and images.zip to assign images where needed.\n"
            "- Best results require numbered questions and options formatted like A), B), C), D).\n"
        )

    def _clean_text(self, value: str) -> str:
        return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()
