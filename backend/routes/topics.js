import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import Topic from "../models/Topic.js";
import Question from "../models/Question.js";
import {
  buildClassIdCandidates,
  buildSubjectIdCandidates,
  normalizeClassId,
  normalizeLookupToken,
  normalizeSubjectId,
} from "../utils/normalization.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const TOPIC_NAME_MAX_LENGTH = 120;

function normalizeTopicName(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getTopicCellValue(row = {}) {
  const candidates = ["topic", "topicName", "name", "topic name", "topic_name"];
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }

  const firstValue = Object.values(row)[0];
  return firstValue === undefined ? "" : firstValue;
}

function getClassCellValue(row = {}) {
  const candidates = ["classId", "class", "class id", "class_id", "standard", "grade"];
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return "";
}

function getSubjectCellValue(row = {}) {
  const candidates = ["subjectId", "subject", "subject id", "subject_id"];
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return "";
}

/**
 * GET /api/topics?classId=...&subjectId=...
 * Returns topics for a class + subject
 */
router.get("/", async (req, res) => {
  try {
    const { classId, subjectId, search } = req.query;

    const normalizeName = (value) => String(value || "").trim();
    const normalizeLower = (value) => normalizeName(value).toLowerCase().replace(/[^a-z0-9]/g, "");

    const filter = {};
    const questionFilter = {};
    let classCandidates = [];
    let subjectCandidates = [];

    if (classId) {
      classCandidates = buildClassIdCandidates(classId);
      filter.classId = { $in: classCandidates };
      questionFilter.classId = { $in: classCandidates };
    }

    if (subjectId) {
      subjectCandidates = buildSubjectIdCandidates(subjectId);
      filter.subjectId = { $in: subjectCandidates };
      questionFilter.subjectId = { $in: subjectCandidates };
    }

    if (search) {
      filter.name = { $regex: String(search).trim(), $options: "i" };
    }

    const [topicDocs, questionTopicIds, questionCountRows] = await Promise.all([
      Topic.find(filter).lean(),
      classId && subjectId ? Question.distinct("topicId", questionFilter) : Promise.resolve([]),
      Question.aggregate([
        {
          $match: {
            ...questionFilter,
            topicId: { $nin: ["", null] },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: {
              classId: "$classId",
              subjectId: "$subjectId",
              topicId: "$topicId",
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const merged = new Map();
    const makeTopicKey = (topic) =>
      `${topic.classId || classId || ""}|${topic.subjectId || subjectId || ""}|${normalizeLower(topic.name)}`;
    const questionCountByTopicId = new Map();
    const questionCountByNormalizedName = new Map();

    questionCountRows.forEach((row) => {
      const rowClassId = normalizeClassId(row?._id?.classId || "");
      const rowSubjectId = normalizeSubjectId(row?._id?.subjectId || "");
      const rowTopicId = String(row?._id?.topicId || "").trim();
      const count = Number(row.count) || 0;
      if (!rowClassId || !rowSubjectId || !rowTopicId || count <= 0) return;

      const exactKey = `${rowClassId}|${rowSubjectId}|${rowTopicId}`;
      const normalizedKey = `${rowClassId}|${rowSubjectId}|${normalizeLower(rowTopicId)}`;

      questionCountByTopicId.set(exactKey, (questionCountByTopicId.get(exactKey) || 0) + count);
      questionCountByNormalizedName.set(
        normalizedKey,
        (questionCountByNormalizedName.get(normalizedKey) || 0) + count
      );
    });

    const getTopicQuestionCount = (topic) => {
      const topicClassId = String(topic?.classId || classId || "");
      const topicSubjectId = String(topic?.subjectId || subjectId || "");
      if (!topicClassId || !topicSubjectId) return 0;

      const exactIds = new Set([
        topic?._id?.toString?.(),
        topic?.id?.toString?.(),
      ].filter(Boolean));

      const normalizedNames = new Set([
        topic?.name,
        topic?.nameLower,
        normalizeLower(topic?.name),
      ].filter(Boolean).map((value) => normalizeLower(value)));

      const exactCount = Array.from(exactIds).reduce(
        (total, value) =>
          total + (questionCountByTopicId.get(`${topicClassId}|${topicSubjectId}|${String(value)}`) || 0),
        0
      );

      const nameCount = Array.from(normalizedNames).reduce(
        (total, value) =>
          total + (questionCountByNormalizedName.get(`${topicClassId}|${topicSubjectId}|${String(value)}`) || 0),
        0
      );

      return exactCount + nameCount;
    };

    topicDocs.forEach((topic) => {
      const key = makeTopicKey(topic);
      if (!key) return;
      merged.set(key, {
        _id: topic._id,
        id: topic._id,
        name: topic.name,
        nameLower: topic.nameLower || key,
        classId: topic.classId,
        subjectId: topic.subjectId,
        questionCount: getTopicQuestionCount(topic),
      });
    });

    await Promise.all(
      questionTopicIds.map(async (topicId) => {
        const rawValue = normalizeName(topicId);
        if (!rawValue) return;
        const lookupClauses = [{ nameLower: normalizeLower(rawValue) }];
        if (/^[0-9a-fA-F]{24}$/.test(rawValue)) {
          lookupClauses.push({ _id: rawValue });
        }

        const existingTopic = await Topic.findOne({
          classId: { $in: classCandidates },
          subjectId: { $in: subjectCandidates },
          $or: lookupClauses,
        }).lean();

        const topicName = existingTopic?.name || rawValue;
        const topicKey = makeTopicKey({
          name: topicName,
          classId: existingTopic?.classId || classId,
          subjectId: existingTopic?.subjectId || subjectId,
        });

        if (!topicKey || merged.has(topicKey)) return;

        merged.set(topicKey, {
          _id: existingTopic?._id || rawValue,
          id: existingTopic?._id || rawValue,
          name: topicName,
          nameLower: normalizeLower(topicName),
          classId: existingTopic?.classId || classId,
          subjectId: existingTopic?.subjectId || subjectId,
          questionCount: existingTopic
            ? getTopicQuestionCount(existingTopic)
            : questionCountByNormalizedName.get(
                `${classId}|${subjectId}|${normalizeLower(rawValue)}`
              ) || 0,
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
    const normalizedClassId = normalizeClassId(classId);
    const normalizedSubjectId = normalizeSubjectId(subjectId);

    // If already exists, return it (idempotent)
    const existing = await Topic.findOne({
      classId: normalizedClassId,
      subjectId: normalizedSubjectId,
      nameLower,
    });
    if (existing) {
      return res.status(200).json({ topic: existing, existed: true });
    }

    const topic = await Topic.create({
      name: cleanName,
      nameLower,
      classId: normalizedClassId,
      subjectId: normalizedSubjectId,
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

/**
 * POST /api/topics/bulk-upload
 * FormData: { file }
 * Excel columns supported:
 * class | classId | standard | grade
 * subject | subjectId
 * topic | topicName | name | topic name
 */
router.post("/bulk-upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid Excel file. Please upload .xlsx or .xls format.",
      });
    }

    const firstSheetName = workbook.SheetNames?.[0];
    if (!firstSheetName) {
      return res.status(400).json({
        success: false,
        message: "Excel file does not contain any sheets.",
      });
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty. Add at least one topic row.",
      });
    }

    if (rows.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Maximum 1000 topic rows allowed per upload.",
      });
    }

    const validationErrors = [];
    const seenInFile = new Map();
    const validTopics = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const normalizedClassId = normalizeClassId(getClassCellValue(row));
      const normalizedSubjectId = normalizeSubjectId(getSubjectCellValue(row));
      const rawName = getTopicCellValue(row);
      const name = normalizeTopicName(rawName);

      if (!normalizedClassId) {
        validationErrors.push({
          row: rowNumber,
          message: "Class is required. Use class, classId, standard, or grade column.",
        });
        return;
      }

      if (!normalizedSubjectId) {
        validationErrors.push({
          row: rowNumber,
          message: "Subject is required. Use subject or subjectId column.",
        });
        return;
      }

      if (!name) {
        validationErrors.push({
          row: rowNumber,
          message: "Topic name is required.",
        });
        return;
      }

      if (name.length < 2) {
        validationErrors.push({
          row: rowNumber,
          message: "Topic name must be at least 2 characters.",
        });
        return;
      }

      if (name.length > TOPIC_NAME_MAX_LENGTH) {
        validationErrors.push({
          row: rowNumber,
          message: `Topic name must be ${TOPIC_NAME_MAX_LENGTH} characters or less.`,
        });
        return;
      }

      const nameLower = normalizeLookupToken(name);
      if (!nameLower) {
        validationErrors.push({
          row: rowNumber,
          message: "Topic name must contain letters or numbers.",
        });
        return;
      }

      const rowKey = `${normalizedClassId}|${normalizedSubjectId}|${nameLower}`;
      const duplicateRow = seenInFile.get(rowKey);
      if (duplicateRow) {
        validationErrors.push({
          row: rowNumber,
          message: `Duplicate topic in file for same class and subject. Same as row ${duplicateRow}.`,
        });
        return;
      }

      seenInFile.set(rowKey, rowNumber);
      validTopics.push({
        row: rowNumber,
        name,
        nameLower,
        classId: normalizedClassId,
        subjectId: normalizedSubjectId,
      });
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed for one or more rows.",
        errors: validationErrors,
      });
    }

    const existingTopics = await Topic.find({
      $or: validTopics.map((item) => ({
        classId: item.classId,
        subjectId: item.subjectId,
        nameLower: item.nameLower,
      })),
    }).lean();

    const existingByNameLower = new Map(
      existingTopics.map((item) => [
        `${item.classId}|${item.subjectId}|${item.nameLower}`,
        item,
      ])
    );

    const toInsert = validTopics.filter(
      (item) =>
        !existingByNameLower.has(`${item.classId}|${item.subjectId}|${item.nameLower}`)
    );
    const skippedExisting = validTopics
      .filter((item) =>
        existingByNameLower.has(`${item.classId}|${item.subjectId}|${item.nameLower}`)
      )
      .map((item) => ({
        row: item.row,
        name: item.name,
        classId: item.classId,
        subjectId: item.subjectId,
        reason: "Already exists",
      }));

    if (toInsert.length > 0) {
      await Topic.insertMany(
        toInsert.map((item) => ({
          name: item.name,
          nameLower: item.nameLower,
          classId: item.classId,
          subjectId: item.subjectId,
        })),
        { ordered: false }
      );
    }

    return res.status(201).json({
      success: true,
      message:
        toInsert.length > 0
          ? `Imported ${toInsert.length} topic${toInsert.length === 1 ? "" : "s"} successfully.`
          : "No new topics were imported.",
      importedCount: toInsert.length,
      skippedCount: skippedExisting.length,
      skipped: skippedExisting,
    });
  } catch (err) {
    console.error("POST /api/topics/bulk-upload error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * PUT /api/topics/:id
 * Body: { name, classId, subjectId }
 * Updates topic metadata.
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, classId, subjectId } = req.body || {};

    const currentTopic = await Topic.findById(id);
    if (!currentTopic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const update = {};

    if (name !== undefined) {
      const cleanName = String(name || "").trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ message: "Topic name is too short" });
      }
      update.name = cleanName;
      update.nameLower = normalizeLookupToken(cleanName);
    }

    if (classId !== undefined) {
      const normalizedClassId = normalizeClassId(classId);
      if (!normalizedClassId) {
        return res.status(400).json({ message: "classId is required" });
      }
      update.classId = normalizedClassId;
    }

    if (subjectId !== undefined) {
      const normalizedSubjectId = normalizeSubjectId(subjectId);
      if (!normalizedSubjectId) {
        return res.status(400).json({ message: "subjectId is required" });
      }
      update.subjectId = normalizedSubjectId;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const targetClassId = update.classId || currentTopic.classId;
    const targetSubjectId = update.subjectId || currentTopic.subjectId;
    const targetNameLower = update.nameLower || currentTopic.nameLower;

    const existingTarget = await Topic.findOne({
      _id: { $ne: id },
      classId: targetClassId,
      subjectId: targetSubjectId,
      nameLower: targetNameLower,
    });

    if (existingTarget) {
      const questionUpdate = await Question.updateMany(
        { topicId: id },
        {
          $set: {
            topicId: existingTarget._id.toString(),
            classId: existingTarget.classId,
            subjectId: existingTarget.subjectId,
          },
        }
      );

      await Topic.findByIdAndDelete(id);

      return res.json({
        topic: existingTarget,
        merged: true,
        movedQuestionCount: questionUpdate.modifiedCount || 0,
        message: `Topic merged into "${existingTarget.name}".`,
      });
    }

    Object.assign(currentTopic, update);
    const topic = await currentTopic.save();

    const questionUpdate = await Question.updateMany(
      { topicId: id },
      {
        $set: {
          classId: topic.classId,
          subjectId: topic.subjectId,
        },
      }
    );

    return res.json({
      topic,
      merged: false,
      movedQuestionCount: questionUpdate.modifiedCount || 0,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "Topic already exists for this class and subject. Please try again.",
      });
    }

    console.error("PUT /api/topics/:id error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/topics/:id
 * Deletes a topic only when no question uses it.
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const usedCount = await Question.countDocuments({
      topicId: id,
      isDeleted: { $ne: true },
    });

    if (usedCount > 0) {
      return res.status(409).json({
        message: `Cannot delete topic because ${usedCount} question${usedCount === 1 ? "" : "s"} use it.`,
      });
    }

    const deleted = await Topic.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Topic not found" });
    }

    return res.json({ success: true, deletedCount: 1 });
  } catch (err) {
    console.error("DELETE /api/topics/:id error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
