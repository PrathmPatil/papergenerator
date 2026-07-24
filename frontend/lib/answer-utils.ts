export interface AnswerKeyEntry {
  label: string;
  answer: string;
  marks?: number;
}

export interface AnswerKeySection {
  name: string;
  entries: AnswerKeyEntry[];
}

const formatMixedAnswer = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key} → ${String(entry ?? "")}`)
      .join("; ");
  }
  return String(value).trim();
};

export const getCorrectAnswer = (question: any): string => {
  const options = Array.isArray(question?.options) ? question.options : [];
  const correctOptions = options
    .filter((option) => option?.isCorrect)
    .map((option) => String(option?.id || "").trim().toUpperCase())
    .filter(Boolean);

  if (correctOptions.length > 0) return correctOptions.join(", ");

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

export const buildAnswerKeyHtml = (config: any): string => {
  const sections = buildAnswerKeySections(config);
  const title = String(config?.title || "Question Paper");
  const classLevel = String(config?.classLevel || config?.classId || "");
  const totalMarks = config?.totalMarks ?? "";
  const durationMinutes = config?.durationMinutes ?? "";
  const paperCode = String(config?.code || "");

  const sectionBlocks = sections
    .map((section) => {
      const rows = section.entries
        .map(
          (entry) => `
            <tr>
              <td style="width: 80px; text-align: center; font-weight: 600;">${entry.label}</td>
              <td>${entry.answer}</td>
              <td style="width: 90px; text-align: center;">${
                entry.marks ? `[${entry.marks} Mark${entry.marks === 1 ? "" : "s"}]` : ""
              }</td>
            </tr>
          `
        )
        .join("");

      if (!rows) return "";

      return `
        <div class="answer-key-section">
          <h3>${section.name}</h3>
          <table>
            <thead>
              <tr>
                <th>Q. No.</th>
                <th>Answer</th>
                <th>Marks</th>
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
        <h2>${title}</h2>
        <div class="answer-key-meta">
          ${classLevel ? `<span><strong>Class:</strong> ${classLevel}</span>` : ""}
          ${totalMarks !== "" ? `<span><strong>Total Marks:</strong> ${totalMarks}</span>` : ""}
          ${durationMinutes !== "" ? `<span><strong>Duration:</strong> ${durationMinutes} min</span>` : ""}
          ${paperCode ? `<span><strong>Code:</strong> ${paperCode}</span>` : ""}
        </div>
      </div>
      ${sectionBlocks}
    </div>
  `;
};

export const buildAnswerKeyStyles = () => `
  body {
    margin: 0;
    padding: 24px;
    font-family: "Times New Roman", Times, serif;
    color: #000;
    background: #fff;
  }

  #answer-key-document {
    max-width: 800px;
    margin: 0 auto;
  }

  .answer-key-header {
    text-align: center;
    margin-bottom: 24px;
    border-bottom: 2px solid #000;
    padding-bottom: 16px;
  }

  .answer-key-header h1 {
    margin: 0 0 8px;
    font-size: 24px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .answer-key-header h2 {
    margin: 0 0 12px;
    font-size: 18px;
    font-weight: 600;
  }

  .answer-key-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px 24px;
    font-size: 13px;
  }

  .answer-key-section {
    margin-top: 24px;
  }

  .answer-key-section h3 {
    margin: 0 0 10px;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }

  th, td {
    border: 1px solid #000;
    padding: 8px 10px;
    font-size: 14px;
    vertical-align: top;
  }

  th {
    background: #f3f3f3;
    font-weight: 700;
  }
`;
