/**
 * @swagger
 * tags:
 *   name: Questions
 *   description: Question APIs
 */

/**
 * @swagger
 * /api/questions/create:
 *   post:
 *     summary: Create a new question
 *     tags: [Questions]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               payload:
 *                 type: string
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Question created
 */

/**
 * @swagger
 * /api/questions/filter:
 *   post:
 *     summary: Get questions by filters
 *     tags: [Questions]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: string
 *               subjectId:
 *                 type: string
 *               topicId:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Question list
 */

import express from "express";
const router = express.Router();
import multer from "multer";
import path from "path";
import Question from "../models/Question.js";
import Topic from "../models/Topic.js";
import { normalizeQuestionPayload } from "../middleware/normalizeImageQuestion.middleware.js";
import {
  buildClassIdCandidates,
  buildSubjectIdCandidates,
  normalizeClassId,
  normalizeSubjectId,
} from "../utils/normalization.js";
import XLSX from "xlsx";
import unzipper from "unzipper";

router.post("/test", (req, res) => {
  res.json({ message: "OK" });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize:
      Number(process.env.UPLOAD_FILE_SIZE_LIMIT_MB || 100) * 1024 * 1024,
  },
});

const detectMimeTypeByFileName = (fileName = "") => {
  const ext = path.extname(String(fileName)).toLowerCase();
  const mimeByExt = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".avif": "image/avif",
  };

  return mimeByExt[ext] || "application/octet-stream";
};

const bufferToDataUrl = (buffer, mimeType) => {
  if (!buffer) return "";
  return `data:${mimeType || "application/octet-stream"};base64,${buffer.toString("base64")}`;
};

const QUESTION_DUPLICATE_FIELDS = [
  "type",
  "classId",
  "subjectId",
  "topicId",
  "text",
  "paragraph",
  "media",
  "options",
  "subQuestions",
  "correctAnswer",
  "matches",
  "marks",
  "negativeMarks",
  "difficulty",
  "ocrText",
  "ocrConfidence",
  "needsReview",
];

const ARRAY_DUPLICATE_FIELDS = new Set(["media", "options", "subQuestions"]);
const NUMBER_DUPLICATE_FIELDS = new Set([
  "marks",
  "negativeMarks",
  "ocrConfidence",
]);

const normalizeDuplicateValue = (value) => {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDuplicateValue(item));
  }

  if (typeof value === "object") {
    const normalized = {};

    Object.keys(value)
      .filter(
        (key) =>
          ![
            "_id",
            "__v",
            "createdAt",
            "deletedAt",
            "deletedBy",
            "isDeleted",
          ].includes(key),
      )
      .sort()
      .forEach((key) => {
        normalized[key] = normalizeDuplicateValue(value[key]);
      });

    return normalized;
  }

  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  return value;
};

const normalizeDuplicateField = (field, value) => {
  if (ARRAY_DUPLICATE_FIELDS.has(field)) {
    return Array.isArray(value) ? normalizeDuplicateValue(value) : [];
  }

  if (NUMBER_DUPLICATE_FIELDS.has(field)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : "";
  }

  if (field === "needsReview") {
    return Boolean(value);
  }

  if (field === "difficulty") {
    return normalizeDuplicateValue(value || "easy");
  }

  return normalizeDuplicateValue(value);
};

const buildQuestionDuplicateFingerprint = (question = {}) => {
  const source =
    typeof question.toObject === "function" ? question.toObject() : question;
  const normalized = {};

  QUESTION_DUPLICATE_FIELDS.forEach((field) => {
    normalized[field] = normalizeDuplicateField(field, source?.[field]);
  });

  return JSON.stringify(normalized);
};

const findDuplicateQuestion = async (question) => {
  const fingerprint = buildQuestionDuplicateFingerprint(question);
  const topicId = question.topicId || "";
  const topicFilter = topicId ? topicId : { $in: ["", null] };

  const candidates = await Question.find({
    classId: question.classId,
    subjectId: question.subjectId,
    topicId: topicFilter,
    type: question.type,
    isDeleted: { $ne: true },
  }).lean();

  return (
    candidates.find(
      (candidate) =>
        buildQuestionDuplicateFingerprint(candidate) === fingerprint,
    ) || null
  );
};

const filterDuplicateQuestions = async (questions = []) => {
  const uniqueQuestions = [];
  const duplicateQuestions = [];
  const seenBatchFingerprints = new Set();
  const candidateCache = new Map();

  const getCandidateCacheKey = (question = {}) =>
    [
      question.classId || "",
      question.subjectId || "",
      question.topicId || "__empty__",
      question.type || "",
    ].join("|");

  const getExistingCandidates = async (question = {}) => {
    const cacheKey = getCandidateCacheKey(question);
    if (candidateCache.has(cacheKey)) {
      return candidateCache.get(cacheKey);
    }

    const topicId = question.topicId || "";
    const topicFilter = topicId ? topicId : { $in: ["", null] };
    const candidates = await Question.find({
      classId: question.classId,
      subjectId: question.subjectId,
      topicId: topicFilter,
      type: question.type,
      isDeleted: { $ne: true },
    }).lean();

    const fingerprints = new Map();
    candidates.forEach((candidate) => {
      fingerprints.set(buildQuestionDuplicateFingerprint(candidate), candidate);
    });

    candidateCache.set(cacheKey, fingerprints);
    return fingerprints;
  };

  for (const question of questions) {
    const fingerprint = buildQuestionDuplicateFingerprint(question);

    if (seenBatchFingerprints.has(fingerprint)) {
      duplicateQuestions.push(question);
      continue;
    }

    const existingCandidates = await getExistingCandidates(question);
    const existingDuplicate = existingCandidates.get(fingerprint);
    if (existingDuplicate) {
      duplicateQuestions.push({
        ...question,
        duplicateOf: existingDuplicate._id?.toString(),
      });
      continue;
    }

    seenBatchFingerprints.add(fingerprint);
    uniqueQuestions.push(question);
  }

  return { uniqueQuestions, duplicateQuestions };
};

const chunkArray = (items = [], size = 500) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const insertQuestionsInChunks = async (questions = [], chunkSize = 500) => {
  const insertedDocs = [];

  for (const chunk of chunkArray(questions, chunkSize)) {
    const inserted = await Question.insertMany(chunk, { ordered: false });
    insertedDocs.push(...inserted);
  }

  return insertedDocs;
};

const resolveInsertedCount = (insertResult, fallback = 0) => {
  if (Array.isArray(insertResult)) {
    return insertResult.length;
  }

  const rawCount =
    Number(insertResult?.insertedCount) ||
    Number(Object.keys(insertResult?.insertedIds || {}).length) ||
    Number(insertResult?.result?.nInserted) ||
    Number(insertResult?.nInserted) ||
    0;

  return rawCount || fallback;
};

const normalizeExcelKey = (key) =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const EXCEL_KEY_ALIASES = {
  class: "classId",
  classid: "classId",
  classname: "classId",
  classlevel: "classId",
  subject: "subjectId",
  subjectid: "subjectId",
  subjectname: "subjectId",
  topic: "topicName",
  topicid: "topicId",
  topicname: "topicName",
  type: "type",
  questiontype: "questionType",
  difficulty: "difficulty",
  marks: "marks",
  negativemarks: "negativeMarks",
  questiontext: "questionText",
  question: "questionText",
  questionimage: "questionImage",
  questiongroupid: "questionGroupId",
  imagegroupid: "imageGroupId",
  groupid: "groupId",
  instructiontext: "instructionText",
  subquestionid: "subQuestionId",
  subquestiontext: "subQuestionText",
  subquestiontype: "subQuestionType",
  optiona: "option_A",
  optionb: "option_B",
  optionc: "option_C",
  optiond: "option_D",
  optione: "option_E",
  optionatext: "optionAText",
  optionaimage: "optionAImage",
  optionbtext: "optionBText",
  optionbimage: "optionBImage",
  optionctext: "optionCText",
  optioncimage: "optionCImage",
  optiondtext: "optionDText",
  optiondimage: "optionDImage",
  optionetext: "optionEText",
  optioneimage: "optionEImage",
  correctanswer: "correctAnswer",
};

const normalizeExcelRow = (row) => {
  const normalizedRow = {};

  Object.entries(row || {}).forEach(([key, value]) => {
    const normalizedKey = EXCEL_KEY_ALIASES[normalizeExcelKey(key)] || key;
    normalizedRow[normalizedKey] = value;
  });

  return normalizedRow;
};

const normalizeQuestionType = (value, fallback = "mcq_text") => {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const typeAliases = {
    mcq: "mcq_text",
    mcqtext: "mcq_text",
    textmcq: "mcq_text",
    multiplechoice: "mcq_text",
    multiplechoicequestion: "mcq_text",
    paragraph: "paragraph",
    passage: "paragraph",
    mcqimage: "mcq_image",
    imagemcq: "mcq_image",
    imagewithsubquestions: "image_subquestions",
    imagesubquestions: "image_subquestions",
    shortanswer: "short_answer",
    descriptive: "short_answer",
    descriptiveanswer: "short_answer",
    desc: "short_answer",
    longanswer: "short_answer",
    essay: "short_answer",
    truefalse: "true_false",
    matching: "matching",
  };

  return (
    typeAliases[normalized] ||
    String(value || fallback)
      .trim()
      .toLowerCase()
  );
};

const normalizeDifficulty = (value) => {
  const normalized = String(value || "easy")
    .trim()
    .toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : "easy";
};

const normalizeCorrectAnswer = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const verifyInsertedQuestions = async (insertedDocs = []) => {
  const ids = Array.isArray(insertedDocs)
    ? insertedDocs
        .map((question) => question?._id?.toString?.())
        .filter(Boolean)
    : Object.values(insertedDocs?.insertedIds || {})
        .map((id) => id?.toString?.())
        .filter(Boolean);

  if (ids.length === 0) {
    return 0;
  }

  return Question.countDocuments({ _id: { $in: ids } });
};

const normalizeTopicKey = (value = "") =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeLegacyTopicKey = (value = "") =>
  String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const buildTopicKeyCandidates = (value = "") =>
  [
    normalizeTopicKey(value),
    normalizeLegacyTopicKey(value),
    String(value || "").trim().toLowerCase(),
  ].filter(Boolean);

async function hasExistingQuestionTopic(classCandidates, subjectCandidates, topicKey) {
  const existingTopicIds = await Question.distinct("topicId", {
    classId: { $in: classCandidates },
    subjectId: { $in: subjectCandidates },
    topicId: { $nin: ["", null] },
    isDeleted: { $ne: true },
  });

  return existingTopicIds.some((value) => normalizeTopicKey(value) === topicKey);
}

async function findExistingTopic(classCandidates, subjectCandidates, topicIdentifier) {
  const rawValue = String(topicIdentifier || "").trim();
  if (!rawValue) return null;

  const topicKey = normalizeTopicKey(rawValue);
  const keyCandidates = buildTopicKeyCandidates(rawValue);
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawValue);

  const existing = await Topic.findOne({
    classId: { $in: classCandidates },
    subjectId: { $in: subjectCandidates },
    $or: [
      ...(isObjectId ? [{ _id: rawValue }] : []),
      { nameLower: { $in: keyCandidates } },
    ],
  }).lean();

  if (existing) return existing;

  const candidateTopics = await Topic.find({
    classId: { $in: classCandidates },
    subjectId: { $in: subjectCandidates },
  }).lean();

  return (
    candidateTopics.find(
      (topic) =>
        normalizeTopicKey(topic?.name) === topicKey ||
        normalizeTopicKey(topic?.nameLower) === topicKey
    ) || null
  );
}

function logUnknownTopics(unknownTopics = []) {
  if (unknownTopics.length === 0) return;

  console.warn(
    "[UNKNOWN_TOPICS]",
    JSON.stringify(
      unknownTopics.map((topic) => ({
        classId: topic.classId,
        subjectId: topic.subjectId,
        topicName: topic.topicName,
        compactKey: normalizeTopicKey(topic.topicName),
        legacyKey: normalizeLegacyTopicKey(topic.topicName),
        rows: topic.rows,
      }))
    )
  );
}

async function ensureTopicId(classId, subjectId, topicIdentifier) {
  if (!classId || !subjectId || !topicIdentifier) {
    return "";
  }

  const rawValue = String(topicIdentifier).trim();
  if (!rawValue) {
    return "";
  }

  const classCandidates = buildClassIdCandidates(classId);
  const subjectCandidates = buildSubjectIdCandidates(subjectId);
  const nameLower = normalizeTopicKey(rawValue);
  const existing = await findExistingTopic(classCandidates, subjectCandidates, rawValue);

  if (existing) {
    return existing._id.toString();
  }

  try {
    const created = await Topic.create({
      name: rawValue,
      nameLower,
      classId,
      subjectId,
    });
    return created._id.toString();
  } catch (err) {
    if (err?.code === 11000) {
      const deduped = await findExistingTopic(classCandidates, subjectCandidates, rawValue);
      if (deduped) {
        return deduped._id.toString();
      }
    }
    throw err;
  }
}

const buildUnknownTopicResponse = (unknownTopics = []) => ({
  success: false,
  code: "UNKNOWN_TOPICS",
  message:
    "New topic found in Excel. Please add the topic from the Topic menu, then upload the Excel again.",
  unknownTopics,
});

async function findUnknownTopicsFromRows(rows = []) {
  const uniqueTopicRequests = new Map();

  rows.forEach((sourceRow, index) => {
    const row = normalizeExcelRow(sourceRow);
    const classId = normalizeClassId(row.classId);
    const subjectId = normalizeSubjectId(row.subjectId);
    const rawTopic = String(row.topicId || row.topicName || "").trim();

    if (!classId || !subjectId || !rawTopic) return;

    const topicKey = normalizeTopicKey(rawTopic);
    const requestKey = `${classId}|${subjectId}|${topicKey}`;

    if (!uniqueTopicRequests.has(requestKey)) {
      uniqueTopicRequests.set(requestKey, {
        classId,
        subjectId,
        topicName: rawTopic,
        rows: [],
      });
    }

    uniqueTopicRequests.get(requestKey).rows.push(index + 1);
  });

  const unknownTopics = [];

  for (const request of uniqueTopicRequests.values()) {
    const topicKey = normalizeTopicKey(request.topicName);
    const classCandidates = buildClassIdCandidates(request.classId);
    const subjectCandidates = buildSubjectIdCandidates(request.subjectId);
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(request.topicName);
    const existingTopic = await findExistingTopic(
      classCandidates,
      subjectCandidates,
      request.topicName
    );

    const existingFromQuestions =
      !existingTopic && !isObjectId
        ? await hasExistingQuestionTopic(classCandidates, subjectCandidates, topicKey)
        : false;

    if (!existingTopic && !existingFromQuestions) {
      unknownTopics.push(request);
    }
  }

  logUnknownTopics(unknownTopics);

  return unknownTopics;
}

/*
====================================
 CREATE QUESTION (TEXT + IMAGE)
====================================
*/

router.post(
  "/create",
  upload.any(),
  normalizeQuestionPayload,
  async (req, res) => {
    try {
      const normalizedPayload = { ...req.normalizedPayload };
      const topicIdentifier =
        normalizedPayload.topicId || normalizedPayload.topicName || "";

      normalizedPayload.topicId = await ensureTopicId(
        normalizedPayload.classId,
        normalizedPayload.subjectId,
        topicIdentifier,
      );

      const existingDuplicate = await findDuplicateQuestion(normalizedPayload);
      if (existingDuplicate) {
        return res.json({
          success: true,
          duplicate: true,
          message: "Question already exists with the same fields",
          createdCount: 0,
          duplicateCount: 1,
          skippedCount: 1,
          question: existingDuplicate,
        });
      }

      const q = new Question(normalizedPayload);
      await q.save();

      res.json({ success: true, question: q });
    } catch (err) {
      console.error("❌ ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
    // try {
    //   if (!req.body.payload) {
    //     return res.status(400).json({
    //       success: false,
    //       error: "payload not received",
    //     });
    //   }

    //   const payload = JSON.parse(req.body.payload);

    //   const media = req.files.map((f) => ({
    //     url: `/uploads/${f.filename}`,
    //     alt: f.originalname,
    //     mimeType: f.mimetype,
    //   }));

    //   const q = new Question({ ...payload, media });

    //   await q.save();
    //   res.json({ success: true, question: q });
    // } catch (err) {
    //   console.error("❌ ERROR:", err);
    //   res.status(500).json({ success: false, error: err.message });
    // }
  },
);

// POST /api/questions/create-bulk-upload
router.post("/create-bulk-upload", async (req, res) => {
  try {
    const questions = req.body; // ✅ DIRECT ARRAY

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Payload must be a non-empty array",
      });
    }

    const topicCache = new Map();
    const unknownTopics = await findUnknownTopicsFromRows(questions);
    if (unknownTopics.length > 0) {
      return res.status(409).json(buildUnknownTopicResponse(unknownTopics));
    }

    const normalizeTopic = async (classId, subjectId, topicId, topicName) => {
      const rawValue = String(topicId || topicName || "").trim();
      if (!rawValue) return "";

      // const normalizeKey = (s = "") => String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const normalizeKey = normalizeTopicKey;
      const cacheKey = `${classId}|${subjectId}|${normalizeKey(rawValue)}`;
      if (topicCache.has(cacheKey)) {
        return topicCache.get(cacheKey);
      }

      const resolvedId = await ensureTopicId(classId, subjectId, rawValue);
      topicCache.set(cacheKey, resolvedId);
      return resolvedId;
    };

    const prepared = await Promise.all(
      questions.map(async (question, index) => {
        const row = normalizeExcelRow(question);
        const classId = normalizeClassId(row.classId);
        const subjectId = normalizeSubjectId(row.subjectId);
        const normalizedText = String(
          row.text || row.questionText || row.question || "",
        ).trim();
        const normalizedType = normalizeQuestionType(
          row.type || row.questionType || row.question_type,
        );
        const correctAnswer = normalizeCorrectAnswer(row.correctAnswer);
        const freeTextCorrectAnswer = String(row.correctAnswer || "").trim();
        const isMcqText = normalizedType === "mcq_text";

        const inferredOptions = !isMcqText
          ? []
          : Array.isArray(row.options)
            ? row.options.map((option) => ({
                ...option,
                id: String(option.id || "")
                  .trim()
                  .toUpperCase(),
                text: String(option.text || ""),
                isCorrect:
                  option.isCorrect === true ||
                  String(option.id || "")
                    .trim()
                    .toUpperCase() === correctAnswer,
              }))
            : ["A", "B", "C", "D", "E"]
                .map((id) => {
                  const text = row[`option${id}`] || row[`option_${id}`] || "";
                  if (!text) return null;
                  return {
                    id,
                    text: String(text),
                    isCorrect: correctAnswer === id,
                  };
                })
                .filter(Boolean);

        if (!classId || !subjectId || !normalizedType || !normalizedText) {
          throw new Error(`Missing required fields at row ${index + 1}`);
        }

        if (
          normalizedType === "mcq_text" &&
          !["A", "B", "C", "D", "E"].includes(correctAnswer)
        ) {
          throw new Error(`Invalid correctAnswer at row ${index + 1}`);
        }

        if (normalizedType === "mcq_text" && inferredOptions.length < 2) {
          throw new Error(`At least 2 options required at row ${index + 1}`);
        }

        // Ensure subQuestions is initialized for all questions
        const processedQuestion = {
          ...row,
          classId,
          subjectId,
          type: normalizedType,
          difficulty: normalizeDifficulty(row.difficulty),
          text: normalizedText,
          options: isMcqText ? inferredOptions : [],
          correctAnswer: isMcqText ? correctAnswer : freeTextCorrectAnswer,
          topicId: await normalizeTopic(
            classId,
            subjectId,
            row.topicId,
            row.topicName,
          ),
        };

        // Initialize subQuestions as empty array if not provided
        if (!processedQuestion.subQuestions) {
          processedQuestion.subQuestions = [];
        }

        return processedQuestion;
      }),
    );

    const { uniqueQuestions, duplicateQuestions } =
      await filterDuplicateQuestions(prepared);

    const inserted = uniqueQuestions.length
      ? await insertQuestionsInChunks(uniqueQuestions)
      : [];
    const createdCount = resolveInsertedCount(inserted, 0);
    const insertedDocs = inserted;
    const verifiedCount = await verifyInsertedQuestions(insertedDocs);

    if (uniqueQuestions.length > 0 && createdCount === 0) {
      return res.status(500).json({
        success: false,
        message: "No questions were inserted into the database",
        receivedCount: questions.length,
        uniqueCount: uniqueQuestions.length,
        duplicateCount: duplicateQuestions.length,
      });
    }

    if (createdCount > 0 && verifiedCount !== createdCount) {
      return res.status(500).json({
        success: false,
        message:
          "Questions were created but could not be verified in the database",
        createdCount,
        verifiedCount,
        receivedCount: questions.length,
        uniqueCount: uniqueQuestions.length,
        duplicateCount: duplicateQuestions.length,
      });
    }

    const subQuestionCount = (
      Array.isArray(insertedDocs) ? insertedDocs : []
    ).reduce(
      (total, question) =>
        total +
        (Array.isArray(question.subQuestions)
          ? question.subQuestions.length
          : 0),
      0,
    );

    res.json({
      success: true,
      createdCount,
      receivedCount: questions.length,
      uniqueCount: uniqueQuestions.length,
      subQuestionCount,
      duplicateCount: duplicateQuestions.length,
      skippedCount: duplicateQuestions.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/*
====================================
 POST: FILTER QUESTIONS
====================================
*/

// router.post("/", async (req, res) => {
//   try {
//     const { classId, subjectId, topicId, type, difficulty } = req.body;

//     // -------------------------------------------
//     // VALIDATION
//     // -------------------------------------------
//     if (
//       !classId &&
//       !subjectId &&
//       !topicId &&
//       !type &&
//       !difficulty
//     ) {
//       return res.status(400).json({
//         success: false,
//         error: "At least one filter is required (classId, subjectId, topicId, type, difficulty)."
//       });
//     }

//     // DEPENDENCY CHECKS
//     if (topicId && !subjectId) {
//       return res.status(400).json({
//         success: false,
//         error: "topicId requires subjectId."
//       });
//     }

//     if (subjectId && !classId) {
//       return res.status(400).json({
//         success: false,
//         error: "subjectId requires classId."
//       });
//     }

//     // -------------------------------------------
//     // BUILD FILTER OBJECT
//     // -------------------------------------------
//     const filter = {};

//     if (classId) filter.classId = classId;
//     if (subjectId) filter.subjectId = subjectId;
//     if (topicId) filter.topicId = topicId;
//     if (type) filter.type = type;
//     if (difficulty) filter.difficulty = difficulty;

//     // -------------------------------------------
//     // QUERY DATABASE
//     // -------------------------------------------
//     const questions = await Question.find(filter).lean();

//     // -------------------------------------------
//     // RESULT CHECK
//     // -------------------------------------------
//     if (!questions.length) {
//       return res.status(404).json({
//         success: false,
//         error: "No questions found."
//       });
//     }

//     res.json({
//       success: true,
//       count: questions.length,
//       questions
//     });

//   } catch (err) {
//     console.error("❌ FILTER ERROR:", err);
//     res.status(500).json({
//       success: false,
//       error: "Internal Server Error",
//       details: err.message
//     });
//   }
// });

router.post("/", async (req, res) => {
  try {
    const {
      classId,
      subjectId,
      topicId,
      type,
      difficulty,
      search,
      page = 1,
      limit = 10,
      selectedQuestions = [],
    } = req.body;

    const filter = {};
    filter.$or = [{ isDeleted: false }, { isDeleted: { $exists: false } }];
    // -----------------------------
    // BASIC FILTERS
    // -----------------------------
    if (classId) filter.classId = classId;

    if (subjectId) {
      filter.subjectId = { $in: subjectId.split(",").map((s) => s.trim()) };
    }

    if (topicId) {
      const requestedTopicIds = topicId
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const topicFilterValues = new Set(requestedTopicIds);

      const topicDocs = await Topic.find({
        $or: [
          {
            _id: {
              $in: requestedTopicIds.filter((id) =>
                /^[0-9a-fA-F]{24}$/.test(id),
              ),
            },
          },
          {
            nameLower: {
              $in: requestedTopicIds.map((id) => normalizeExcelKey(id)),
            },
          },
        ],
      }).lean();

      topicDocs.forEach((topic) => {
        topicFilterValues.add(topic._id.toString());
        topicFilterValues.add(topic.name);
        topicFilterValues.add(topic.nameLower);
      });

      filter.topicId = { $in: Array.from(topicFilterValues) };
    }

    // -----------------------------
    // DIFFICULTY
    // -----------------------------
    if (difficulty) {
      filter.difficulty = {
        $in: difficulty.split(",").map((d) => d.trim()),
      };
    }

    // -----------------------------
    // TYPE
    // -----------------------------
    if (type) {
      filter.type = {
        $in: type.split(",").map((t) => t.trim()),
      };
    }

    // -----------------------------
    // SEARCH
    // -----------------------------
    if (search) {
      filter.text = { $regex: search, $options: "i" };
    }

    const pageSize = Math.max(Number(limit), 1);
    const currentPage = Math.max(Number(page), 1);
    const skip = (currentPage - 1) * pageSize;

    let selectedQuestionDocs = [];
    let remainingQuestions = [];

    // ======================================================
    // 1️⃣ FETCH SELECTED QUESTIONS FIRST (NO PAGINATION)
    // ======================================================
    if (selectedQuestions.length > 0) {
      selectedQuestionDocs = await Question.find({
        ...filter,
        _id: { $in: selectedQuestions },
      }).lean();
      // Preserve order of selectedQuestions array
      const map = new Map(
        selectedQuestionDocs.map((q) => [q._id.toString(), q]),
      );

      selectedQuestionDocs = selectedQuestions
        .map((id) => map.get(id))
        .filter(Boolean);
    }

    // ======================================================
    // 2️⃣ FETCH REMAINING QUESTIONS (EXCLUDING SELECTED)
    // ======================================================
    const remainingFilter = {
      ...filter,
      ...(selectedQuestions.length && {
        _id: { $nin: selectedQuestions },
      }),
    };

    const [remainingDocs, totalRemaining] = await Promise.all([
      Question.find(remainingFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),

      Question.countDocuments(remainingFilter),
    ]);

    remainingQuestions = remainingDocs;

    // ======================================================
    // 3️⃣ MERGE RESULT
    // ======================================================
    const questions = [...selectedQuestionDocs, ...remainingQuestions];

    res.json({
      success: true,
      questions,
      count: questions.length,
      selectedCount: selectedQuestionDocs.length,
      totalRecords: totalRemaining + selectedQuestionDocs.length,
      currentPage,
      totalPages: Math.ceil(totalRemaining / pageSize),
    });
  } catch (err) {
    console.error("❌ QUESTION FETCH ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: err.message,
    });
  }
});

// router.post("/", async (req, res) => {
//   try {
//     const { classId, subjectId, topicId, type, difficulty, search, page = 1, limit = 10 } = req.body;

//     // -------------------------------------------
//     // BUILD FILTER OBJECT
//     // -------------------------------------------
//     const filter = {};

//     if (classId) filter.classId = classId;
//     if (subjectId) filter.subjectId = subjectId;
//     if (topicId) filter.topicId = topicId;
//     if (type) filter.type = type;
//     if (difficulty) filter.difficulty = difficulty;

//     if (search) {
//       filter.text = { $regex: search, $options: "i" };
//     }

//     // -------------------------------------------
//     // PAGINATION CALC
//     // -------------------------------------------
//     const currentPage = Math.max(Number(page), 1);
//     const pageSize = Math.max(Number(limit), 1);
//     const skip = (currentPage - 1) * pageSize;

//     // -------------------------------------------
//     // DB QUERIES (PARALLEL)
//     // -------------------------------------------
//     const [questions, totalRecords] = await Promise.all([
//       Question.find(filter)
//         .sort({ createdAt: -1 }) // 🔥 recent first
//         .skip(skip)
//         .limit(pageSize)
//         .lean(),
//       Question.countDocuments(filter),
//     ]);

//     // -------------------------------------------
//     // NO DATA CASE
//     // -------------------------------------------
//     if (!questions.length) {
//       return res.status(200).json({
//         success: true,
//         questions: [],
//         count: 0,
//         totalRecords,
//         totalPages: 0,
//         currentPage,
//       });
//     }

//     // -------------------------------------------
//     // RESPONSE
//     // -------------------------------------------
//     res.json({
//       success: true,
//       count: questions.length, // records in current page
//       totalRecords,
//       totalPages: Math.ceil(totalRecords / pageSize),
//       currentPage,
//       questions,
//     });
//   } catch (err) {
//     console.error("❌ QUESTION FETCH ERROR:", err);
//     res.status(500).json({
//       success: false,
//       error: "Internal Server Error",
//       details: err.message,
//     });
//   }
// });

// UPDATE QUESTION META (text / options / marks / difficulty)
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === "bulk-update" || id === "bulk-delete") {
      return next();
    }
    const { text, options, correctAnswer, marks, difficulty, topicId } =
      req.body || {};

    const update = {};

    if (topicId !== undefined) {
      const rawTopicId = String(topicId || "").trim();
      if (!rawTopicId) {
        update.topicId = "";
      } else {
        const topic = /^[0-9a-fA-F]{24}$/.test(rawTopicId)
          ? await Topic.findById(rawTopicId).lean()
          : await Topic.findOne({
              nameLower: normalizeExcelKey(rawTopicId),
            }).lean();

        if (!topic) {
          return res.status(400).json({
            success: false,
            message: "Selected topic was not found",
          });
        }

        update.topicId = topic._id.toString();
        update.classId = topic.classId;
        update.subjectId = topic.subjectId;
      }
    }

    if (text !== undefined) {
      const normalizedText = String(text).trim();
      if (!normalizedText) {
        return res.status(400).json({
          success: false,
          message: "question text is required",
        });
      }
      update.text = normalizedText;
    }

    if (options !== undefined) {
      if (!Array.isArray(options)) {
        return res.status(400).json({
          success: false,
          message: "options must be an array",
        });
      }

      const normalizedOptions = options.map((option, index) => ({
        id: String(option?.id || String.fromCharCode(65 + index))
          .trim()
          .toUpperCase(),
        text: String(option?.text || "").trim(),
        mediaUrl: String(option?.mediaUrl || "").trim(),
        isCorrect: option?.isCorrect === true,
      }));

      if (normalizedOptions.length > 0 && normalizedOptions.length < 2) {
        return res.status(400).json({
          success: false,
          message: "At least 2 options are required",
        });
      }

      if (
        normalizedOptions.some((option) => !option.text && !option.mediaUrl)
      ) {
        return res.status(400).json({
          success: false,
          message: "Each option must have text or an image",
        });
      }

      const correctOptions = normalizedOptions.filter(
        (option) => option.isCorrect,
      );
      if (normalizedOptions.length > 0 && correctOptions.length !== 1) {
        return res.status(400).json({
          success: false,
          message: "Exactly one correct option is required",
        });
      }

      update.options = normalizedOptions;
      update.correctAnswer = correctOptions[0]?.id;
    } else if (correctAnswer !== undefined) {
      update.correctAnswer = String(correctAnswer || "").trim();
    }

    if (marks !== undefined) {
      const parsedMarks = Number(marks);
      if (!Number.isFinite(parsedMarks) || parsedMarks < 0) {
        return res.status(400).json({
          success: false,
          message: "marks must be a valid non-negative number",
        });
      }
      update.marks = parsedMarks;
    }

    if (difficulty !== undefined) {
      const normalizedDifficulty = String(difficulty).toLowerCase();
      if (!["easy", "medium", "hard"].includes(normalizedDifficulty)) {
        return res.status(400).json({
          success: false,
          message: "difficulty must be one of easy, medium, hard",
        });
      }
      update.difficulty = normalizedDifficulty;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Nothing to update. Provide text, options, marks, difficulty, and/or topic",
      });
    }

    const result = await Question.findOneAndUpdate(
      {
        _id: id,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      { $set: update },
      { new: true },
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    return res.json({
      success: true,
      message: "Question updated successfully",
      question: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// BULK UPDATE QUESTION META (marks / difficulty / topic)
router.put("/bulk-update", async (req, res) => {
  try {
    const { ids, marks, difficulty, topicId } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids must be a non-empty array",
      });
    }

    const update = {};

    if (marks !== undefined) {
      const parsedMarks = Number(marks);
      if (!Number.isFinite(parsedMarks) || parsedMarks < 0) {
        return res.status(400).json({
          success: false,
          message: "marks must be a valid non-negative number",
        });
      }
      update.marks = parsedMarks;
    }

    if (difficulty !== undefined) {
      const normalizedDifficulty = String(difficulty).toLowerCase();
      if (!["easy", "medium", "hard"].includes(normalizedDifficulty)) {
        return res.status(400).json({
          success: false,
          message: "difficulty must be one of easy, medium, hard",
        });
      }
      update.difficulty = normalizedDifficulty;
    }

    if (topicId !== undefined) {
      const rawTopicId = String(topicId || "").trim();
      if (!rawTopicId) {
        update.topicId = "";
      } else {
        const topic = /^[0-9a-fA-F]{24}$/.test(rawTopicId)
          ? await Topic.findById(rawTopicId).lean()
          : await Topic.findOne({
              nameLower: normalizeExcelKey(rawTopicId),
            }).lean();

        if (!topic) {
          return res.status(400).json({
            success: false,
            message: "Selected topic was not found",
          });
        }

        update.topicId = topic._id.toString();
        update.classId = topic.classId;
        update.subjectId = topic.subjectId;
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update. Provide marks, difficulty, and/or topic",
      });
    }

    const result = await Question.updateMany(
      {
        _id: { $in: ids },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      { $set: update },
    );

    return res.json({
      success: true,
      message: "Questions updated successfully",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// BULK DELETE QUESTIONS
router.put("/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids must be a non-empty array",
      });
    }

    const uniqueIds = [...new Set(ids.map((id) => String(id)).filter(Boolean))];

    if (uniqueIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids must contain at least one valid question id",
      });
    }

    const result = await Question.updateMany(
      {
        _id: { $in: uniqueIds },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user?.id || null,
        },
      },
    );

    return res.json({
      success: true,
      message: "Questions deleted successfully",
      deletedCount: result.modifiedCount,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Question.findOneAndUpdate(
      {
        _id: id,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user?.id || null,
        },
      },
      { new: true },
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    return res.json({
      success: true,
      message: "Question deleted successfully",
      deletedCount: 1,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.post(
  "/bulk-image-upload",
  upload.fields([
    { name: "excel", maxCount: 1 },
    { name: "images", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const excelFile = req?.files?.excel?.[0];
      const zipFile = req?.files?.images?.[0];

      if (!excelFile || !zipFile) {
        return res.status(400).json({
          success: false,
          message: "Both excel and images zip files are required",
        });
      }

      const zipDirectory = await unzipper.Open.buffer(zipFile.buffer);
      const imageDataMap = new Map();

      for (const entry of zipDirectory.files) {
        if (entry.type !== "File") continue;

        const imageBuffer = await entry.buffer();
        const mimeType = detectMimeTypeByFileName(entry.path);
        const dataUrl = bufferToDataUrl(imageBuffer, mimeType);

        const normalizedFullPath = entry.path.replace(/\\/g, "/").toLowerCase();
        const baseName = path.basename(entry.path).toLowerCase();

        imageDataMap.set(normalizedFullPath, dataUrl);
        imageDataMap.set(baseName, dataUrl);
      }

      const resolveImageDataUrl = (imageName) => {
        const rawName = String(imageName || "").trim();
        if (!rawName) return "";

        const normalized = rawName.replace(/\\/g, "/").toLowerCase();
        const baseName = path.basename(normalized).toLowerCase();

        return imageDataMap.get(normalized) || imageDataMap.get(baseName) || "";
      };

      const workbook = XLSX.read(excelFile.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const normalizedRows = rows.map(normalizeExcelRow);
      const unknownTopics = await findUnknownTopicsFromRows(normalizedRows);
      if (unknownTopics.length > 0) {
        return res.status(409).json(buildUnknownTopicResponse(unknownTopics));
      }

      const topicCache = new Map();
      const questionType = req.query.questionType || "mcq_image";
      const normalize = (value) => String(value || "").trim();
      const hasGroupedImageRows = normalizedRows.some((row) => {
        const groupId =
          normalize(row.questionGroupId) ||
          normalize(row.groupId) ||
          normalize(row.imageGroupId);

        const subQuestionText =
          normalize(row.subQuestionText) || normalize(row.sub_question_text);

        const subQuestionId =
          normalize(row.subQuestionId) || normalize(row.sub_question_id);

        return Boolean(groupId || subQuestionText || subQuestionId);
      });

      if (questionType === "image_subquestions" && !hasGroupedImageRows) {
        return res.status(400).json({
          success: false,
          message:
            "No grouped questions found in Excel. For image subquestions, your Excel must have rows grouped by 'question_group_id' or 'groupId', and include 'subQuestionText' or 'subQuestionId' columns.",
        });
      }

      const normalizeTopic = async (classId, subjectId, topicId, topicName) => {
        const rawValue = String(topicId || topicName || "").trim();
        if (!rawValue) return "";

        // const normalizeKey = (s = "") => String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizeKey = normalizeTopicKey;
        const cacheKey = `${classId}|${subjectId}|${normalizeKey(rawValue)}`;
        if (topicCache.has(cacheKey)) {
          return topicCache.get(cacheKey);
        }

        const resolvedId = await ensureTopicId(classId, subjectId, rawValue);
        topicCache.set(cacheKey, resolvedId);
        return resolvedId;
      };

      const questions = await Promise.all(
        normalizedRows.map(async (row, i) => {
          const classId = normalizeClassId(row.classId);
          const subjectId = normalizeSubjectId(row.subjectId);
          const topicId = await normalizeTopic(
            classId,
            subjectId,
            row.topicId,
            row.topicName,
          );
          const correctAnswer = normalizeCorrectAnswer(row.correctAnswer);

          const options = ["A", "B", "C", "D"].map((id) => ({
            id,
            text: row[`option${id}Text`] || row[`option_${id}`] || "",
            mediaUrl: resolveImageDataUrl(
              row[`option${id}Image`] || row[`option_${id}_image`],
            ),
            isCorrect: correctAnswer === id,
          }));

          return {
            classId,
            subjectId,
            topicId,
            type: normalizeQuestionType(
              row.type || row.questionType,
              "mcq_image",
            ),
            difficulty: normalizeDifficulty(row.difficulty),
            marks: Number(row.marks) || 1,
            negativeMarks: Number(row.negativeMarks) || 0,
            text: row.questionText,
            media: resolveImageDataUrl(row.questionImage)
              ? [
                  {
                    url: resolveImageDataUrl(row.questionImage),
                    alt: String(row.questionImage || ""),
                  },
                ]
              : [],
            options,
            correctAnswer,
            subQuestions: [], // Initialize subQuestions as empty array
          };
        }),
      );

      if (hasGroupedImageRows) {
        const groupedRows = new Map();
        normalizedRows.forEach((row, index) => {
          const groupId =
            normalize(row.questionGroupId) ||
            normalize(row.groupId) ||
            normalize(row.imageGroupId);

          const fallbackKey = [
            normalize(row.classId),
            normalize(row.subjectId),
            normalize(row.topicId),
            normalize(row.questionImage),
            normalize(row.questionText),
          ].join("|");

          const key = groupId || fallbackKey || `row_${index + 1}`;
          if (!groupedRows.has(key)) {
            groupedRows.set(key, []);
          }
          groupedRows.get(key).push(row);
        });

        const groupedQuestions = await Promise.all(
          Array.from(groupedRows.values()).map(async (group) => {
            const firstRow = group[0];
            const classId = normalizeClassId(firstRow.classId);
            const subjectId = normalizeSubjectId(firstRow.subjectId);
            const topicId = await normalizeTopic(
              classId,
              subjectId,
              firstRow.topicId,
              firstRow.topicName,
            );

            const questionImage =
              normalize(firstRow.questionImage) || normalize(firstRow.image);

            const media = resolveImageDataUrl(questionImage)
              ? [
                  {
                    url: resolveImageDataUrl(questionImage),
                    alt: String(questionImage || ""),
                  },
                ]
              : [];

            const subQuestions = group.map((row, index) => {
              const subQuestionId =
                normalize(row.subQuestionId) ||
                normalize(row.sub_question_id) ||
                String(index + 1);

              const subQuestionText =
                normalize(row.subQuestionText) ||
                normalize(row.sub_question_text) ||
                normalize(row.questionText);

              const correctAnswer = normalizeCorrectAnswer(row.correctAnswer);
              const options = ["A", "B", "C", "D"]
                .map((id) => ({
                  id,
                  text: row[`option${id}Text`] || row[`option_${id}`] || "",
                  mediaUrl: resolveImageDataUrl(
                    row[`option${id}Image`] || row[`option_${id}_image`] || "",
                  ),
                  isCorrect: correctAnswer === id,
                }))
                .filter((option) => option.text || option.mediaUrl);

              return {
                id: subQuestionId,
                type: "mcq_text",
                text: subQuestionText,
                options,
                marks: Number(row.marks) || 1,
                negativeMarks: Number(row.negativeMarks) || 0,
                correctAnswer,
              };
            });

            return {
              classId,
              subjectId,
              topicId,
              type:
                questionType === "image_subquestions"
                  ? "image_subquestions"
                  : normalizeQuestionType(
                      firstRow.type || firstRow.questionType,
                      "mcq_image",
                    ),
              difficulty: normalizeDifficulty(firstRow.difficulty),
              marks: subQuestions.reduce(
                (sum, sq) => sum + (Number(sq.marks) || 0),
                0,
              ),
              negativeMarks: subQuestions.reduce(
                (sum, sq) => sum + (Number(sq.negativeMarks) || 0),
                0,
              ),
              text:
                normalize(firstRow.instructionText) ||
                normalize(firstRow.questionText) ||
                "",
              media,
              options: [],
              correctAnswer: null,
              subQuestions,
            };
          }),
        );

        const { uniqueQuestions, duplicateQuestions } =
          await filterDuplicateQuestions(groupedQuestions);

        const inserted = uniqueQuestions.length
          ? await insertQuestionsInChunks(uniqueQuestions)
          : [];
        const createdCount = resolveInsertedCount(inserted, 0);
        const insertedDocs = inserted;
        const verifiedCount = await verifyInsertedQuestions(insertedDocs);

        if (uniqueQuestions.length > 0 && createdCount === 0) {
          return res.status(500).json({
            success: false,
            message: "No questions were inserted into the database",
            receivedCount: groupedQuestions.length,
            uniqueCount: uniqueQuestions.length,
            duplicateCount: duplicateQuestions.length,
          });
        }

        if (createdCount > 0 && verifiedCount !== createdCount) {
          return res.status(500).json({
            success: false,
            message:
              "Questions were created but could not be verified in the database",
            createdCount,
            verifiedCount,
            receivedCount: groupedQuestions.length,
            uniqueCount: uniqueQuestions.length,
            duplicateCount: duplicateQuestions.length,
          });
        }

        const subQuestionCount = (
          Array.isArray(insertedDocs) ? insertedDocs : []
        ).reduce(
          (total, question) =>
            total +
            (Array.isArray(question.subQuestions)
              ? question.subQuestions.length
              : 0),
          0,
        );

        return res.json({
          success: true,
          createdCount,
          receivedCount: groupedQuestions.length,
          uniqueCount: uniqueQuestions.length,
          subQuestionCount,
          duplicateCount: duplicateQuestions.length,
          skippedCount: duplicateQuestions.length,
        });
      }

      const { uniqueQuestions, duplicateQuestions } =
        await filterDuplicateQuestions(questions);

      const inserted = uniqueQuestions.length
        ? await insertQuestionsInChunks(uniqueQuestions)
        : [];
      const createdCount = resolveInsertedCount(inserted, 0);
      const insertedDocs = inserted;
      const verifiedCount = await verifyInsertedQuestions(insertedDocs);

      if (uniqueQuestions.length > 0 && createdCount === 0) {
        return res.status(500).json({
          success: false,
          message: "No questions were inserted into the database",
          receivedCount: questions.length,
          uniqueCount: uniqueQuestions.length,
          duplicateCount: duplicateQuestions.length,
        });
      }

      if (createdCount > 0 && verifiedCount !== createdCount) {
        return res.status(500).json({
          success: false,
          message:
            "Questions were created but could not be verified in the database",
          createdCount,
          verifiedCount,
          receivedCount: questions.length,
          uniqueCount: uniqueQuestions.length,
          duplicateCount: duplicateQuestions.length,
        });
      }

      const subQuestionCount = (
        Array.isArray(insertedDocs) ? insertedDocs : []
      ).reduce(
        (total, question) =>
          total +
          (Array.isArray(question.subQuestions)
            ? question.subQuestions.length
            : 0),
        0,
      );

      res.json({
        success: true,
        createdCount,
        receivedCount: questions.length,
        uniqueCount: uniqueQuestions.length,
        subQuestionCount,
        duplicateCount: duplicateQuestions.length,
        skippedCount: duplicateQuestions.length,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

export default router;
