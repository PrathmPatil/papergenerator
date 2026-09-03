/** Build questionId → topicId from paper snapshots or question payloads. */
export function buildQuestionTopicMap(
  questions: Array<Record<string, unknown> | null | undefined> | null | undefined
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const question of questions || []) {
    if (!question || typeof question !== "object") continue;
    const id = String(
      (question as any).questionId ?? (question as any)._id ?? (question as any).id ?? ""
    );
    const topicId = String((question as any).topicId ?? "");
    if (id && topicId) map[id] = topicId;
  }
  return map;
}

/**
 * Keep only selected question ids whose topic is still in the allowed set.
 * Questions without a known topic mapping are kept (safe for generate remounts).
 */
export function pruneSelectedQuestionsByTopics(
  selected: Record<string, string[]>,
  allowedTopicIds: string[],
  topicByQuestionId: Record<string, string>
): Record<string, string[]> {
  const allowed = new Set((allowedTopicIds || []).map((id) => String(id)));
  let changed = false;
  const next: Record<string, string[]> = {};

  for (const [sectionId, ids] of Object.entries(selected || {})) {
    const list = Array.isArray(ids) ? ids : [];
    const filtered = list.filter((qid) => {
      const topicId = topicByQuestionId[String(qid)];
      if (!topicId) return true;
      return allowed.has(String(topicId));
    });
    if (filtered.length !== list.length) changed = true;
    next[sectionId] = filtered;
  }

  return changed ? next : selected;
}

/** Drop sub-question selections for questions that are no longer selected. */
export function pruneSelectedSubQuestions(
  selectedSubs: Record<string, Record<string, string[]>>,
  selectedQuestions: Record<string, string[]>
): Record<string, Record<string, string[]>> {
  let changed = false;
  const next: Record<string, Record<string, string[]>> = {};

  for (const [sectionId, byQuestion] of Object.entries(selectedSubs || {})) {
    const allowedIds = new Set((selectedQuestions[sectionId] || []).map(String));
    const sectionNext: Record<string, string[]> = {};
    for (const [questionId, subIds] of Object.entries(byQuestion || {})) {
      if (!allowedIds.has(String(questionId))) {
        changed = true;
        continue;
      }
      sectionNext[questionId] = subIds;
    }
    next[sectionId] = sectionNext;
    if (Object.keys(sectionNext).length !== Object.keys(byQuestion || {}).length) {
      changed = true;
    }
  }

  return changed ? next : selectedSubs;
}
