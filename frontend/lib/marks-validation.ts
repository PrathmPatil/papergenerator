export type TopicDistributionRule = {
  topicId: string;
  marks: number;
};

export type MarksSection = {
  id?: string;
  name?: string;
  subjectId: string;
  marks: number;
  rules?: {
    marksPerQuestion?: number;
    topicDistributions?: TopicDistributionRule[];
  };
};

export type MarksValidationInput = {
  totalMarks: number;
  selectedSubjects: string[];
  sections: MarksSection[];
  subjectNames?: Record<string, string>;
  topicNames?: Record<string, string>;
};

export type MarksBalanceSummary = {
  totalAllocated: number;
  remainingMarks: number;
  topicRemainingBySubject: Record<string, number>;
  worstTopicRemaining: number;
  /** Most severe remaining value (subject or topic). Negative means over-allocated. */
  displayRemaining: number;
  isBalanced: boolean;
};

const toSafeInt = (value: unknown, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.floor(num);
};

export const getTopicMarksSum = (section?: MarksSection | null) =>
  (section?.rules?.topicDistributions || [])
    .filter((item) => String(item.topicId || "").trim() !== "")
    .reduce((sum, item) => sum + Math.max(0, toSafeInt(item.marks, 0)), 0);

export const summarizeMarksBalance = (
  totalMarks: number,
  selectedSubjects: string[],
  sections: MarksSection[]
): MarksBalanceSummary => {
  const safeTotal = Math.max(0, toSafeInt(totalMarks, 0));
  const totalAllocated = selectedSubjects.reduce((sum, subjectId) => {
    const section = sections.find((s) => String(s.subjectId) === String(subjectId));
    return sum + Math.max(0, toSafeInt(section?.marks, 0));
  }, 0);

  const remainingMarks = safeTotal - totalAllocated;
  const topicRemainingBySubject: Record<string, number> = {};

  for (const subjectId of selectedSubjects) {
    const section = sections.find((s) => String(s.subjectId) === String(subjectId));
    const subjectMarks = Math.max(0, toSafeInt(section?.marks, 0));
    topicRemainingBySubject[subjectId] = subjectMarks - getTopicMarksSum(section);
  }

  const topicRemainings = Object.values(topicRemainingBySubject);
  const worstTopicRemaining =
    topicRemainings.length > 0 ? Math.min(...topicRemainings) : 0;

  const displayRemaining = Math.min(remainingMarks, worstTopicRemaining);
  const isBalanced = remainingMarks === 0 && worstTopicRemaining === 0 && selectedSubjects.length > 0;

  return {
    totalAllocated,
    remainingMarks,
    topicRemainingBySubject,
    worstTopicRemaining,
    displayRemaining,
    isBalanced,
  };
};

/**
 * Validates subject + topic mark allocation for generate/edit flows.
 * Blocks progress when anything is over-allocated or not fully assigned.
 */
export const validateMarksDistribution = (input: MarksValidationInput): string => {
  const { totalMarks, selectedSubjects, sections, subjectNames = {}, topicNames = {} } = input;
  const safeTotal = Math.max(0, toSafeInt(totalMarks, 0));

  if (safeTotal <= 0) {
    return "Total marks must be greater than 0.";
  }

  if (!selectedSubjects.length) {
    return "Please select at least one subject.";
  }

  const summary = summarizeMarksBalance(safeTotal, selectedSubjects, sections);

  if (summary.remainingMarks < 0) {
    return `Subject marks (${summary.totalAllocated}) exceed total marks (${safeTotal}). Reduce subject marks or increase total marks.`;
  }

  for (const subjectId of selectedSubjects) {
    const subjectName = subjectNames[subjectId] || subjectId;
    const section = sections.find((s) => String(s.subjectId) === String(subjectId));
    const subjectMarks = Math.max(0, toSafeInt(section?.marks, 0));

    if (!section || subjectMarks <= 0) {
      return `Please set marks for ${subjectName}.`;
    }

    const distributions = (section.rules?.topicDistributions || []).filter(
      (rule) => String(rule.topicId || "").trim() !== ""
    );
    if (distributions.length === 0) {
      return `Please select at least one topic for ${subjectName}.`;
    }

    for (const rule of distributions) {
      if (toSafeInt(rule.marks, 0) <= 0) {
        const topicName = topicNames[rule.topicId] || topicNames[String(rule.topicId)] || "topic";
        return `Please assign marks for ${topicName} in ${subjectName}.`;
      }
    }

    const topicMarksSum = distributions.reduce(
      (sum, item) => sum + Math.max(0, toSafeInt(item.marks, 0)),
      0
    );

    if (topicMarksSum > subjectMarks) {
      return `Topic marks for ${subjectName} (${topicMarksSum}) exceed subject marks (${subjectMarks}). Reduce topic marks or increase subject/total marks.`;
    }

    if (topicMarksSum < subjectMarks) {
      return `Topic marks for ${subjectName} must equal subject marks (${subjectMarks}). Remaining topic marks: ${subjectMarks - topicMarksSum}.`;
    }
  }

  if (summary.remainingMarks > 0) {
    return `Please allocate all marks. Remaining subject marks: ${summary.remainingMarks}.`;
  }

  if (!summary.isBalanced) {
    return "Marks are not balanced. Adjust total, subject, or topic marks before continuing.";
  }

  return "";
};

/**
 * Hydrate edit sections from paper + template without silently changing topic marks.
 * Paper section marks win for subject totals; template rules keep topic allocations
 * so mismatches stay visible and must be fixed before submit.
 */
export const hydrateEditSections = (params: {
  paperSections?: Array<{ id?: string; subjectId?: string; marks?: number }>;
  editSections?: any[];
  templateSections?: any[];
}): MarksSection[] => {
  const paperSections = params.paperSections || [];
  const editSections = params.editSections || [];
  const templateSections = params.templateSections || [];
  const sourceSections = editSections.length > 0 ? editSections : templateSections;

  return sourceSections.map((section: any) => {
    const templateSection = templateSections.find(
      (s: any) =>
        String(s.id) === String(section.id) ||
        String(s.subjectId) === String(section.subjectId)
    );
    const paperSection = paperSections.find(
      (s) =>
        String(s.id) === String(section.id) ||
        (section.subjectId && String(s.subjectId) === String(section.subjectId))
    );

    const rulesSource = section.rules || templateSection?.rules;
    const templateMarks = toSafeInt(section.marks ?? templateSection?.marks, 0);
    const marks =
      paperSection != null && paperSection.marks != null
        ? toSafeInt(paperSection.marks, templateMarks)
        : templateMarks;

    return {
      id: String(section.id || templateSection?.id || `sec_${section.subjectId || ""}`),
      name: String(section.name || templateSection?.name || ""),
      subjectId: String(section.subjectId || templateSection?.subjectId || ""),
      marks,
      rules: {
        marksPerQuestion: Math.max(1, toSafeInt(rulesSource?.marksPerQuestion, 1)),
        topicDistributions: Array.isArray(rulesSource?.topicDistributions)
          ? rulesSource.topicDistributions
              .map((rule: any) => ({
                topicId: String(rule.topicId || "").trim(),
                marks: Math.max(0, toSafeInt(rule.marks, 0)),
              }))
              .filter((rule: TopicDistributionRule) => rule.topicId)
          : [],
      },
    };
  });
};
