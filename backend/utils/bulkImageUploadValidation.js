const OPTION_KEYS = ["A", "B", "C", "D", "E"];

export const validateImageOptionRows = (rows = []) => {
  const issues = [];

  rows.forEach((row, index) => {
    OPTION_KEYS.forEach((optionId) => {
      const textKey = `option${optionId}Text`;
      const imageKey = `option${optionId}Image`;
      const fallbackTextKey = `option_${optionId}`;
      const fallbackImageKey = `option_${optionId}_image`;

      const textValue = String(
        row?.[textKey] ?? row?.[fallbackTextKey] ?? ""
      ).trim();
      const imageValue = String(
        row?.[imageKey] ?? row?.[fallbackImageKey] ?? ""
      ).trim();

      if (textValue && imageValue) {
        issues.push({
          row: index + 1,
          option: optionId,
          message: `Row ${index + 1} option ${optionId} cannot contain both text and image.`,
        });
      }
    });
  });

  return issues;
};

export const formatImageOptionValidationErrors = (issues = []) => {
  if (!issues.length) return "";

  const groupedByRow = new Map();

  issues.forEach((issue) => {
    const rowIssues = groupedByRow.get(issue.row) || [];
    if (!rowIssues.includes(issue.option)) {
      rowIssues.push(issue.option);
    }
    groupedByRow.set(issue.row, rowIssues);
  });

  const summaryLines = Array.from(groupedByRow.entries())
    .sort(([a], [b]) => a - b)
    .map(([row, options]) => {
      const optionList = options.join(", ");
      const optionLabel = options.length > 1 ? `options ${optionList}` : `option ${optionList}`;
      return `Question row ${row}: ${optionLabel}`;
    });

  return [
    "Some uploaded rows contain options with both text and image values.",
    "Please keep each option as either text or image only.",
    "",
    ...summaryLines,
  ].join("\n");
};
