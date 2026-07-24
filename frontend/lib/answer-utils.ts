import { formatClassLabel } from "@/lib/utils";

export interface AnswerKeyEntry {
  label: string;
  answer: string;
  marks?: number;
}

export interface AnswerKeySection {
  name: string;
  entries: AnswerKeyEntry[];
}

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const formatMarksLabel = (marks: unknown) => {
  const value = Number(marks);
  if (!Number.isFinite(value) || value <= 0) return "";
  return `[${value} ${value === 1 ? "Mark" : "Marks"}]`;
};

const formatMixedAnswer = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key} → ${String(entry ?? "").trim()}`)
      .filter((part) => !part.endsWith("→"))
      .join("; ");
  }

  const text = String(value).trim();
  if (!text) return "";
  if (/^(true|false)$/i.test(text)) {
    return text.toLowerCase() === "true" ? "True" : "False";
  }
  return text;
};

const resolveOptionLetter = (option: any, index: number): string => {
  const rawId = String(option?.id ?? "").trim().toUpperCase();
  if (/^[A-Z]$/.test(rawId)) return rawId;

  if (/^\d+$/.test(rawId)) {
    const numeric = Number(rawId);
    if (numeric >= 1 && numeric <= 26) return OPTION_LETTERS[numeric - 1];
    if (numeric >= 0 && numeric <= 25) return OPTION_LETTERS[numeric];
  }

  if (index >= 0 && index < OPTION_LETTERS.length) {
    return OPTION_LETTERS[index];
  }

  return rawId || String(index + 1);
};

export const getCorrectAnswer = (question: any): string => {
  const options = Array.isArray(question?.options) ? question.options : [];
  const correctOptions = options
    .map((option: any, index: number) => ({ option, index }))
    .filter((item: { option: any; index: number }) => Boolean(item.option?.isCorrect))
    .map((item: { option: any; index: number }) => resolveOptionLetter(item.option, item.index));

  if (correctOptions.length > 0) {
    return [...new Set(correctOptions)].join(", ");
  }

  const formatted = formatMixedAnswer(question?.correctAnswer);
  if (formatted) return formatted;

  const matches = formatMixedAnswer(question?.matches);
  if (matches) return matches;

  return "";
};

export const buildAnswerKeySections = (config: any): AnswerKeySection[] => {
  const sections = Array.isArray(config?.sections) ? config.sections : [];

  return sections.map((section: any) => {
    const questions = Array.isArray(section?.questions) ? section.questions : [];
    const entries: AnswerKeyEntry[] = [];

    questions.forEach((question: any, questionIndex: number) => {
      const parentNumber = questionIndex + 1;
      const subQuestions = Array.isArray(question?.subQuestions) ? question.subQuestions : [];
      const isParagraphQuestion =
        question?.type === "paragraph" ||
        subQuestions.length > 0 ||
        Boolean(String(question?.paragraph || "").trim());

      if (isParagraphQuestion && subQuestions.length > 0) {
        subQuestions.forEach((subQuestion: any, subIndex: number) => {
          entries.push({
            label: `${parentNumber}(${subIndex + 1})`,
            answer: getCorrectAnswer(subQuestion) || "—",
            marks: Number(subQuestion?.marks) || undefined,
          });
        });
        return;
      }

      entries.push({
        label: String(parentNumber),
        answer: getCorrectAnswer(question) || "—",
        marks: Number(question?.marks) || undefined,
      });
    });

    return {
      name: String(section?.name || "Section"),
      entries,
    };
  });
};

const buildAnswerKeyMetaHtml = (config: any) => {
  const classLevel = formatClassLabel(config?.classLevel || config?.classId);
  const totalMarks = config?.totalMarks ?? "";
  const durationMinutes = config?.durationMinutes ?? "";
  const paperCode = String(config?.code || "").trim();

  const cells = [
    classLevel && classLevel !== "-"
      ? `<td><strong>Class:</strong> ${escapeHtml(classLevel)}</td>`
      : "",
    totalMarks !== "" && totalMarks !== null && totalMarks !== undefined
      ? `<td><strong>Total Marks:</strong> ${escapeHtml(totalMarks)}</td>`
      : "",
    durationMinutes
      ? `<td><strong>Duration:</strong> ${escapeHtml(durationMinutes)} min</td>`
      : "",
    paperCode ? `<td><strong>Code:</strong> ${escapeHtml(paperCode)}</td>` : "",
  ].filter(Boolean);

  if (!cells.length) return "";

  return `
    <table class="answer-key-meta-table">
      <tr>${cells.join("")}</tr>
    </table>
  `;
};

export const buildAnswerKeyHtml = (config: any): string => {
  const sections = buildAnswerKeySections(config);
  const title = String(config?.title || "Question Paper");

  const sectionBlocks = sections
    .map((section) => {
      const rows = section.entries
        .map(
          (entry) => `
            <tr>
              <td class="col-qno">${escapeHtml(entry.label)}</td>
              <td class="col-answer">${escapeHtml(entry.answer)}</td>
              <td class="col-marks">${escapeHtml(formatMarksLabel(entry.marks))}</td>
            </tr>
          `
        )
        .join("");

      if (!rows) return "";

      return `
        <div class="answer-key-section">
          <h3>${escapeHtml(section.name)}</h3>
          <table class="answer-key-table">
            <thead>
              <tr>
                <th class="col-qno">Q. No.</th>
                <th class="col-answer">Answer</th>
                <th class="col-marks">Marks</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    })
    .join("");

  return `
    <div id="answer-key-document">
      <div class="answer-key-header">
        <h1>Answer Key</h1>
        <h2>${escapeHtml(title)}</h2>
        ${buildAnswerKeyMetaHtml(config)}
      </div>
      ${sectionBlocks || `<p class="answer-key-empty">No answers available for this paper.</p>`}
    </div>
  `;
};

/** Flat worksheet layout that opens cleanly in Excel. */
export const buildAnswerKeyExcelHtml = (config: any): string => {
  const sections = buildAnswerKeySections(config);
  const title = String(config?.title || "Question Paper");
  const classLevel = formatClassLabel(config?.classLevel || config?.classId);
  const totalMarks = config?.totalMarks ?? "";
  const durationMinutes = config?.durationMinutes ?? "";
  const paperCode = String(config?.code || "").trim();

  const bodyRows = sections
    .flatMap((section) =>
      section.entries.map(
        (entry) => `
          <tr>
            <td>${escapeHtml(section.name)}</td>
            <td style="text-align:center;">${escapeHtml(entry.label)}</td>
            <td style="text-align:center;font-weight:700;">${escapeHtml(entry.answer)}</td>
            <td style="text-align:center;">${escapeHtml(formatMarksLabel(entry.marks))}</td>
          </tr>
        `
      )
    )
    .join("");

  return `
    <table border="1" cellspacing="0" cellpadding="6">
      <tr>
        <th colspan="4" style="font-size:18px;text-align:center;">Answer Key</th>
      </tr>
      <tr>
        <th colspan="4" style="font-size:14px;text-align:center;">${escapeHtml(title)}</th>
      </tr>
      <tr>
        <td><strong>Class</strong></td>
        <td>${escapeHtml(classLevel !== "-" ? classLevel : "")}</td>
        <td><strong>Total Marks</strong></td>
        <td>${escapeHtml(totalMarks)}</td>
      </tr>
      <tr>
        <td><strong>Duration</strong></td>
        <td>${durationMinutes ? `${escapeHtml(durationMinutes)} min` : ""}</td>
        <td><strong>Code</strong></td>
        <td>${escapeHtml(paperCode)}</td>
      </tr>
      <tr>
        <th>Section</th>
        <th>Q. No.</th>
        <th>Answer</th>
        <th>Marks</th>
      </tr>
      ${bodyRows || `<tr><td colspan="4">No answers available for this paper.</td></tr>`}
    </table>
  `;
};

export const buildAnswerKeyStyles = () => `
  body {
    margin: 0;
    padding: 18px;
    font-family: "Times New Roman", Times, serif;
    color: #000;
    background: #fff;
  }

  #answer-key-document {
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
  }

  .answer-key-header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #000;
    padding-bottom: 12px;
  }

  .answer-key-header h1 {
    margin: 0 0 6px;
    font-size: 22px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .answer-key-header h2 {
    margin: 0 0 10px;
    font-size: 16px;
    font-weight: 600;
  }

  .answer-key-meta-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 auto;
  }

  .answer-key-meta-table td {
    border: none !important;
    padding: 2px 10px;
    font-size: 12px;
    text-align: center;
  }

  .answer-key-section {
    margin-top: 18px;
  }

  .answer-key-section h3 {
    margin: 0 0 8px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .answer-key-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 6px;
  }

  .answer-key-table th,
  .answer-key-table td {
    border: 1px solid #000;
    padding: 7px 8px;
    font-size: 13px;
    vertical-align: middle;
  }

  .answer-key-table th {
    background: #f3f3f3;
    font-weight: 700;
  }

  .col-qno {
    width: 70px;
    text-align: center;
    font-weight: 600;
  }

  .col-answer {
    text-align: center;
    font-weight: 700;
  }

  .col-marks {
    width: 90px;
    text-align: center;
  }

  .answer-key-empty {
    text-align: center;
    margin-top: 24px;
    font-size: 14px;
  }
`;
