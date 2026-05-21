import express from "express";
import Topic from "../models/Topic.js";
import Question from "../models/Question.js";

const router = express.Router();

const normalizeLookupToken = (value = "") =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeClassId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = normalizeLookupToken(raw);
  const numericMatch = normalized.match(/^(?:class)?(\d{1,2})(?:st|nd|rd|th)?$/);
  if (numericMatch) {
    return `class_${Number(numericMatch[1])}`;
  }

  return normalized || raw;
};

const normalizeSubjectId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = normalizeLookupToken(raw);
  const subjectNameToId = {
    mathematics: "maths",
    math: "maths",
    maths: "maths",
    math10: "maths",
    maths10: "maths",
    science: "science",
    science10: "science",
    sci: "science",
    sci10: "science",
    english: "english",
    english10: "english",
    eng: "english",
    eng10: "english",
    reasoning: "reasoning",
    reasoning10: "reasoning",
    "logicalreasoning": "reasoning",
    lr: "reasoning",
    gk: "gk",
    generalknowledge: "gk",
    geography: "geography",
    geo: "geography",
    history: "history",
    hist: "history",
    civics: "civics",
    civic: "civics",
    civicss: "civics",
    physics: "physics",
    phys: "physics",
    phy: "physics",
    chemistry: "chemistry",
    chem: "chemistry",
    biology: "biology",
    bio: "biology",
    biol: "biology",
  };

  return subjectNameToId[normalized] || normalized || raw;
};

const uniqueStrings = (values = []) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const buildClassIdCandidates = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const normalized = normalizeClassId(raw);
  const compact = normalizeLookupToken(raw);
  const aliases = new Set([raw, raw.toLowerCase(), compact, normalized]);

  const numericMatch = normalized.match(/^class_(\d+)$/);
  if (numericMatch) {
    const numeric = Number(numericMatch[1]);
    aliases.add(`class_${numeric}`);
    aliases.add(`class ${numeric}`);
    aliases.add(`Class ${numeric}`);
    aliases.add(`class${numeric}`);
    aliases.add(String(numeric));
    aliases.add(`${numeric}st`);
    aliases.add(`${numeric}nd`);
    aliases.add(`${numeric}rd`);
    aliases.add(`${numeric}th`);
  }

  return uniqueStrings([...aliases]);
};

const buildSubjectIdCandidates = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const normalized = normalizeSubjectId(raw);
  const compact = normalizeLookupToken(raw);
  const aliases = new Set([raw, raw.toLowerCase(), compact, normalized]);

  return uniqueStrings([...aliases]);
};

/**
 * GET /api/topics?classId=...&subjectId=...
 * Returns topics for a class + subject
 */
router.get("/", async (req, res) => {
  try {
    const { classId, subjectId } = req.query;

    if (!classId || !subjectId) {
      return res.status(400).json({
        message: "classId and subjectId are required",
      });
    }

    const normalizeName = (value) => String(value || "").trim();
    const normalizeLower = (value) => normalizeName(value).toLowerCase().replace(/[^a-z0-9]/g, "");

    const classCandidates = buildClassIdCandidates(classId);
    const subjectCandidates = buildSubjectIdCandidates(subjectId);

    const [topicDocs, questionTopicIds] = await Promise.all([
      Topic.find({
        classId: { $in: classCandidates },
        subjectId: { $in: subjectCandidates },
      }).lean(),
      Question.distinct("topicId", {
        classId: { $in: classCandidates },
        subjectId: { $in: subjectCandidates },
      }),
    ]);

    const merged = new Map();

    topicDocs.forEach((topic) => {
      const key = normalizeLower(topic.name);
      if (!key) return;
      merged.set(key, {
        _id: topic._id,
        id: topic._id,
        name: topic.name,
        nameLower: topic.nameLower || key,
        classId: topic.classId,
        subjectId: topic.subjectId,
      });
    });

    await Promise.all(
      questionTopicIds.map(async (topicId) => {
        const rawValue = normalizeName(topicId);
        if (!rawValue) return;

        const existingTopic = await Topic.findOne({
          classId: { $in: classCandidates },
          subjectId: { $in: subjectCandidates },
          $or: [
            { _id: rawValue },
            { nameLower: normalizeLower(rawValue) },
          ],
        }).lean();

        const topicName = existingTopic?.name || rawValue;
        const topicKey = normalizeLower(topicName);

        if (!topicKey || merged.has(topicKey)) return;

        merged.set(topicKey, {
          _id: existingTopic?._id || rawValue,
          id: existingTopic?._id || rawValue,
          name: topicName,
          nameLower: normalizeLower(topicName),
          classId,
          subjectId,
        });
      })
    );

    const topics = Array.from(merged.values()).sort((a, b) =>
      String(a.nameLower || a.name || "").localeCompare(String(b.nameLower || b.name || ""))
    );

    return res.json({ topics });
  } catch (err) {
    console.error("GET /api/topics error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/topics
 * Body: { name, classId, subjectId }
 * Creates a topic (case-insensitive uniqueness)
 */
router.post("/", async (req, res) => {
  try {
    const { name, classId, subjectId } = req.body;

    if (!name || !classId || !subjectId) {
      return res.status(400).json({
        message: "name, classId, subjectId are required",
      });
    }

    const cleanName = String(name).trim();
    if (cleanName.length < 2) {
      return res.status(400).json({ message: "Topic name is too short" });
    }

    const nameLower = String(cleanName).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    // If already exists, return it (idempotent)
    const existing = await Topic.findOne({ classId, subjectId, nameLower });
    if (existing) {
      return res.status(200).json({ topic: existing, existed: true });
    }

    const topic = await Topic.create({
      name: cleanName,
      nameLower,
      classId: normalizeClassId(classId),
      subjectId: normalizeSubjectId(subjectId),
      // createdBy: req.user?.id, // enable if you want
    });

    return res.status(201).json({ topic, existed: false });
  } catch (err) {
    // duplicate key (unique index)
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Topic already exists" });
    }

    console.error("POST /api/topics error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;