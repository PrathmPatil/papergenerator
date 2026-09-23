const QUESTION_DUPLICATE_FIELDS = [
  "type",
  "classId",
  "subjectId",
  "topicId",
  "text",
  "paragraph",
  "media",
  "options",
  "subQuestions",
  "correctAnswer",
  "matches",
  "marks",
  "negativeMarks",
  "difficulty",
  "ocrText",
  "ocrConfidence",
  "needsReview",
];

const ARRAY_DUPLICATE_FIELDS = new Set(["media", "options", "subQuestions"]);
const NUMBER_DUPLICATE_FIELDS = new Set([
  "marks",
  "negativeMarks",
  "ocrConfidence",
]);

const normalizeDuplicateValue = (value) => {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDuplicateValue(item));
  }

  if (typeof value === "object") {
    const normalized = {};

    Object.keys(value)
      .filter(
        (key) =>
          ![
            "_id",
            "__v",
            "createdAt",
            "deletedAt",
            "deletedBy",
            "isDeleted",
          ].includes(key),
      )
      .sort()
      .forEach((key) => {
        normalized[key] = normalizeDuplicateValue(value[key]);
      });

    return normalized;
  }

  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  return value;
};

const normalizeDuplicateField = (field, value) => {
  if (ARRAY_DUPLICATE_FIELDS.has(field)) {
    return Array.isArray(value) ? normalizeDuplicateValue(value) : [];
  }

  if (NUMBER_DUPLICATE_FIELDS.has(field)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : "";
  }

  if (field === "needsReview") {
    return Boolean(value);
  }

  if (field === "difficulty") {
    return normalizeDuplicateValue(value || "easy");
  }

  return normalizeDuplicateValue(value);
};

export const normalizeQuestionText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const buildQuestionDuplicateFingerprint = (question = {}) => {
  const source =
    typeof question.toObject === "function" ? question.toObject() : question;
  const normalized = {};

  QUESTION_DUPLICATE_FIELDS.forEach((field) => {
    normalized[field] = normalizeDuplicateField(field, source?.[field]);
  });

  return JSON.stringify(normalized);
};

export const buildTextDuplicateKey = (question = {}, topicKey = "") =>
  [
    String(question.classId || "").trim(),
    String(question.subjectId || "").trim(),
    String(topicKey || question.topicId || "").trim(),
    String(question.type || "").trim(),
    normalizeQuestionText(question.text),
  ].join("|");
