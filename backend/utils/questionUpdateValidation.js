const toOptionKey = (value = "") => String(value).trim().toUpperCase();

export const normalizeOptionsForQuestionUpdate = (options = [], optionMediaMap = {}) => {
  return (Array.isArray(options) ? options : []).map((option, index) => {
    const optionId = toOptionKey(option?.id || String.fromCharCode(65 + index));
    const replacementMediaUrl = optionMediaMap[optionId] || "";
    const mediaUrl = replacementMediaUrl || String(option?.mediaUrl || "").trim();

    return {
      id: optionId,
      text: mediaUrl ? "" : String(option?.text || "").trim(),
      mediaUrl,
      isCorrect: option?.isCorrect === true,
    };
  });
};

export const hasValidQuestionOptions = (options = []) => {
  return (Array.isArray(options) ? options : []).every((option) => {
    const text = String(option?.text || "").trim();
    const mediaUrl = String(option?.mediaUrl || "").trim();
    return Boolean(text) || Boolean(mediaUrl);
  });
};
