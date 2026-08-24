import mongoose from "mongoose";
import Question from "../models/Question.js";

/**
 * Accurate selected/target marks from DB (not page-local frontend math).
 * selectedQuestions: all selected IDs for the section
 * topicDistributions: required marks per topic from paper template rules
 */
export async function computeSelectionStats(
  selectedQuestions = [],
  topicDistributions = [],
  subQuestionSelections = []
) {
  const selectedIds = Array.isArray(selectedQuestions)
    ? [...new Set(selectedQuestions.map((id) => String(id || "")).filter(Boolean))]
    : [];

  const requiredByTopicMarks = {};
  (Array.isArray(topicDistributions) ? topicDistributions : []).forEach((item) => {
    const topicId = String(item?.topicId || "");
    if (!topicId) return;
    requiredByTopicMarks[topicId] = Math.max(0, Number(item?.marks || 0));
  });

  const totalRequiredMarks = Object.values(requiredByTopicMarks).reduce(
    (sum, marks) => sum + Number(marks || 0),
    0
  );

  const selectedByTopicMarks = {};
  let totalSelectedMarks = 0;
  let resolvedSelectedCount = 0;
  const selectedSubQuestionsByQuestionId = new Map(
    (Array.isArray(subQuestionSelections) ? subQuestionSelections : [])
      .map((selection) => [
        String(selection?.questionId || ""),
        new Set(
          (Array.isArray(selection?.subQuestionIds) ? selection.subQuestionIds : [])
            .map((id) => String(id || ""))
            .filter(Boolean)
        ),
      ])
      .filter(([questionId]) => Boolean(questionId))
  );

  if (selectedIds.length > 0) {
    const objectIds = selectedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const docs = await Question.find({
      _id: { $in: objectIds },
      isDeleted: { $ne: true },
    })
      .select("marks topicId subQuestions")
      .lean();

    const byId = new Map(docs.map((doc) => [String(doc._id), doc]));

    selectedIds.forEach((id) => {
      const doc = byId.get(id);
      if (!doc) return;
      const selectedSubQuestionIds = selectedSubQuestionsByQuestionId.get(id);
      const marks = selectedSubQuestionIds
        ? (Array.isArray(doc.subQuestions) ? doc.subQuestions : []).reduce(
            (sum, subQuestion, index) =>
              selectedSubQuestionIds.has(String(subQuestion?._id || subQuestion?.id || index + 1))
                ? sum + Math.max(0, Number(subQuestion?.marks || 0))
                : sum,
            0
          )
        : Math.max(0, Number(doc.marks || 0));
      const topicId = String(doc.topicId || "");
      totalSelectedMarks += marks;
      resolvedSelectedCount += 1;
      if (!topicId) return;
      selectedByTopicMarks[topicId] = (selectedByTopicMarks[topicId] || 0) + marks;
    });
  }

  return {
    totalSelectedMarks,
    totalRequiredMarks,
    selectedByTopicMarks,
    requiredByTopicMarks,
    selectedCount: resolvedSelectedCount,
    remainingMarks: totalRequiredMarks - totalSelectedMarks,
    isComplete: totalRequiredMarks > 0 && totalSelectedMarks === totalRequiredMarks,
  };
}
