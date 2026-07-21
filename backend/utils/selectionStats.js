import mongoose from "mongoose";
import Question from "../models/Question.js";

/**
 * Accurate selected/target marks from DB (not page-local frontend math).
 * selectedQuestions: all selected IDs for the section
 * topicDistributions: required marks per topic from paper template rules
 */
export async function computeSelectionStats(
  selectedQuestions = [],
  topicDistributions = []
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

  if (selectedIds.length > 0) {
    const objectIds = selectedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const docs = await Question.find({
      _id: { $in: objectIds },
      isDeleted: { $ne: true },
    })
      .select("marks topicId")
      .lean();

    const byId = new Map(docs.map((doc) => [String(doc._id), doc]));

    selectedIds.forEach((id) => {
      const doc = byId.get(id);
      if (!doc) return;
      const marks = Math.max(0, Number(doc.marks || 0));
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
