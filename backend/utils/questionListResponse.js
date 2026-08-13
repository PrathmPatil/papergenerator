const isEmbeddedDataUrl = (value) =>
  typeof value === "string" && value.startsWith("data:");

const stripEmbeddedMediaUrl = (value) =>
  isEmbeddedDataUrl(value) ? "" : value || "";

const hasNonEmptyMediaUrl = (value) =>
  typeof value === "string" && value.trim().length > 0;

const questionHasOptionMedia = (question = {}) => {
  const options = Array.isArray(question?.options) ? question.options : [];
  if (options.some((option) => hasNonEmptyMediaUrl(option?.mediaUrl))) {
    return true;
  }

  const media = Array.isArray(question?.media) ? question.media : [];
  return media.some((item) => {
    const alt = String(item?.alt || "").toLowerCase();
    return alt.startsWith("option_") || alt.startsWith("option-");
  });
};

export const sanitizeQuestionForList = (question = {}) => {
  const sanitized = { ...question };
  const hasOptionMedia = questionHasOptionMedia(question);

  delete sanitized.media;
  delete sanitized.paragraph;
  delete sanitized.ocrText;

  if (Array.isArray(sanitized.options)) {
    sanitized.options = sanitized.options.map((option) => ({
      id: option?.id,
      text: option?.text,
      isCorrect: option?.isCorrect,
      mediaUrl: stripEmbeddedMediaUrl(option?.mediaUrl),
    }));
  }

  if (Array.isArray(sanitized.subQuestions)) {
    sanitized.subQuestions = sanitized.subQuestions.map((subQuestion) => ({
      id: subQuestion?.id,
      type: subQuestion?.type,
      text: subQuestion?.text,
      marks: subQuestion?.marks,
      negativeMarks: subQuestion?.negativeMarks,
      correctAnswer: subQuestion?.correctAnswer,
      mediaUrl: stripEmbeddedMediaUrl(subQuestion?.mediaUrl),
      options: Array.isArray(subQuestion?.options)
        ? subQuestion.options.map((option) => ({
            id: option?.id,
            text: option?.text,
            isCorrect: option?.isCorrect,
            mediaUrl: stripEmbeddedMediaUrl(option?.mediaUrl),
          }))
        : [],
    }));
  }

  sanitized.mediaUrl = stripEmbeddedMediaUrl(sanitized.mediaUrl);
  sanitized.hasMedia = Boolean(question?.media?.length || sanitized.mediaUrl);
  sanitized.hasOptionMedia = hasOptionMedia;
  sanitized.needsTypeReview =
    String(question?.type || "") === "mcq_text" && hasOptionMedia;

  return sanitized;
};

export const sanitizeQuestionsForList = (questions = []) =>
  questions.map((question) => sanitizeQuestionForList(question));
