import Question from "../models/Question.js";
import Topic from "../models/Topic.js";

export const TOPIC_OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export function compactTopicKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function topicsShareCompactKey(topic, key) {
  if (!key) return false;
  return (
    compactTopicKey(topic?.name) === key || compactTopicKey(topic?.nameLower) === key
  );
}

export function pickCanonicalTopic(matches = [], preferredId = "") {
  if (!Array.isArray(matches) || matches.length === 0) return null;

  const preferred = String(preferredId || "").trim();
  if (preferred) {
    const hit = matches.find((topic) => String(topic._id) === preferred);
    if (hit) return hit;
  }

  return matches.slice().sort((a, b) => {
    const byCount =
      (Number(b.questionCount) || 0) - (Number(a.questionCount) || 0);
    if (byCount !== 0) return byCount;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  })[0];
}

export async function findMatchingTopics(
  classCandidates = [],
  subjectCandidates = [],
  topicIdentifier,
) {
  const rawValue = String(topicIdentifier || "").trim();
  if (!rawValue) return [];

  const key = compactTopicKey(rawValue);
  const isObjectId = TOPIC_OBJECT_ID_RE.test(rawValue);
  const filter = {};
  if (classCandidates.length) filter.classId = { $in: classCandidates };
  if (subjectCandidates.length) filter.subjectId = { $in: subjectCandidates };

  const scoped = await Topic.find(filter).lean();
  const matches = scoped.filter((topic) => {
    if (isObjectId && String(topic._id) === rawValue) return true;
    if (isObjectId && Array.isArray(topic.aliasIds) && topic.aliasIds.includes(rawValue)) {
      return true;
    }
    return topicsShareCompactKey(topic, key);
  });

  if (matches.length > 0 || !isObjectId) return matches;

  const byId = await Topic.findById(rawValue).lean();
  if (!byId) return [];

  return scoped.filter((topic) =>
    topicsShareCompactKey(topic, compactTopicKey(byId.name || byId.nameLower)),
  );
}

async function attachQuestionCounts(matches = []) {
  if (matches.length === 0) return matches;

  const ids = matches.map((topic) => String(topic._id));
  const rows = await Question.aggregate([
    {
      $match: {
        topicId: { $in: ids },
        isDeleted: { $ne: true },
      },
    },
    { $group: { _id: "$topicId", count: { $sum: 1 } } },
  ]);
  const countById = new Map(rows.map((row) => [String(row._id), Number(row.count) || 0]));

  return matches.map((topic) => ({
    ...topic,
    questionCount: countById.get(String(topic._id)) || 0,
  }));
}

export async function mergeTopicAliases(keep, matches = []) {
  if (!keep?._id) return "";

  const keepId = String(keep._id);
  const extras = matches.filter((topic) => String(topic._id) !== keepId);
  const compactName = compactTopicKey(keep.name || keep.nameLower);

  if (extras.length > 0) {
    const extraIds = extras.map((topic) => String(topic._id));
    await Question.updateMany(
      { topicId: { $in: extraIds } },
      { $set: { topicId: keepId } },
    );
    await Topic.deleteMany({ _id: { $in: extras.map((topic) => topic._id) } });
    await Topic.updateOne(
      { _id: keep._id },
      { $addToSet: { aliasIds: { $each: extraIds } } },
    );
  }

  if (compactName && String(keep.nameLower || "") !== compactName) {
    await Topic.updateOne({ _id: keep._id }, { $set: { nameLower: compactName } });
  }

  return keepId;
}

export async function resolveCanonicalTopicId(
  classCandidates,
  subjectCandidates,
  topicIdentifier,
  { merge = false, preferredId = "" } = {},
) {
  const matches = await attachQuestionCounts(
    await findMatchingTopics(classCandidates, subjectCandidates, topicIdentifier),
  );
  if (matches.length === 0) return { id: "", matches: [] };

  const keep = pickCanonicalTopic(matches, preferredId || topicIdentifier);
  if (merge) {
    const id = await mergeTopicAliases(keep, matches);
    return { id, matches };
  }

  return { id: String(keep._id), matches };
}

export function collectTopicFilterValues(requestedIds = [], matches = []) {
  const values = new Set();
  requestedIds.forEach((value) => {
    const raw = String(value || "").trim();
    if (!raw) return;
    values.add(raw);
    values.add(compactTopicKey(raw));
  });
  matches.forEach((topic) => {
    values.add(String(topic._id));
    if (topic.name) values.add(String(topic.name));
    if (topic.nameLower) values.add(String(topic.nameLower));
    values.add(compactTopicKey(topic.name || topic.nameLower));
    (Array.isArray(topic.aliasIds) ? topic.aliasIds : []).forEach((aliasId) => {
      if (aliasId) values.add(String(aliasId));
    });
  });
  return Array.from(values).filter(Boolean);
}
