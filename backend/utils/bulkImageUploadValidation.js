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
    .map(([row, options]) => ({ row, options: options.slice().sort() }));

  // Group rows by their option lists to avoid repeating identical option text per row
  const groupedByOptionSet = new Map();
  summaryLines.forEach(({ row, options }) => {
    const key = options.join(",");
    const list = groupedByOptionSet.get(key) || [];
    list.push(row);
    groupedByOptionSet.set(key, list);
  });

  const groupedLines = Array.from(groupedByOptionSet.entries())
    .map(([optionKey, rows]) => {
      const options = optionKey.split(",").filter(Boolean);
      const optionLabel = options.length > 1 ? `Options ${options.join(", ")}` : `Option ${options[0]}`;
      const sortedRows = rows.map(Number).sort((a, b) => a - b);
      const rowList = sortedRows.join(", ");
      return `${optionLabel}: rows ${rowList}`;
    });

  return [
    "Some uploaded rows contain options with both text and image values.",
    "Please keep each option as either text or image only.",
    "",
    "Affected rows:",
    ...groupedLines.map((line) => `- ${line}`),
  ].join("\n");
};
