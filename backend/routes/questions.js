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
import XLSX from "xlsx";
import unzipper from "unzipper";

router.post("/test", (req, res) => {
  console.log("🔥 TEST ROUTE HIT");
  console.log("BODY:", req.body);
  res.json({ message: "OK" });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
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

const normalizeSubjectId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = {
    maths: "maths",
    math: "maths",
    math10: "maths",
    science: "science",
    science10: "science",
    sci10: "science",
    english: "english",
    english10: "english",
    eng10: "english",
    reasoning: "reasoning",
    reasoning10: "reasoning",
    gk: "gk",
    generalknowledge: "gk",
    geography: "geography",
    history: "history",
    civics: "civics",
    physics: "physics",
    chemistry: "chemistry",
    biology: "biology",
  };

  return aliases[normalized] || raw;
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
const NUMBER_DUPLICATE_FIELDS = new Set(["marks", "negativeMarks", "ocrConfidence"]);

const normalizeDuplicateValue = (value) => {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDuplicateValue(item));
  }

  if (typeof value === "object") {
    const normalized = {};

    Object.keys(value)
      .filter((key) => !["_id", "__v", "createdAt", "deletedAt", "deletedBy", "isDeleted"].includes(key))
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
  const source = typeof question.toObject === "function" ? question.toObject() : question;
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

  return candidates.find((candidate) => buildQuestionDuplicateFingerprint(candidate) === fingerprint) || null;
};

const filterDuplicateQuestions = async (questions = []) => {
  const uniqueQuestions = [];
  const duplicateQuestions = [];
  const seenBatchFingerprints = new Set();

  for (const question of questions) {
    const fingerprint = buildQuestionDuplicateFingerprint(question);

    if (seenBatchFingerprints.has(fingerprint)) {
      duplicateQuestions.push(question);
      continue;
    }

    const existingDuplicate = await findDuplicateQuestion(question);
    if (existingDuplicate) {
      duplicateQuestions.push({ ...question, duplicateOf: existingDuplicate._id?.toString() });
      continue;
    }

    seenBatchFingerprints.add(fingerprint);
    uniqueQuestions.push(question);
  }

  return { uniqueQuestions, duplicateQuestions };
};

async function ensureTopicId(classId, subjectId, topicIdentifier) {
  if (!classId || !subjectId || !topicIdentifier) {
    return "";
  }

  const rawValue = String(topicIdentifier).trim();
  if (!rawValue) {
    return "";
  }

  const nameLower = rawValue.toLowerCase();

  // If the value is already a valid Mongo _id, try to resolve it first.
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawValue);
  if (isObjectId) {
    const existingById = await Topic.findById(rawValue).lean();
    if (existingById) {
      return existingById._id.toString();
    }
  }

  const existing = await Topic.findOne({
    classId,
    subjectId,
    nameLower,
  }).lean();

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
      const deduped = await Topic.findOne({
        classId,
        subjectId,
        nameLower,
      }).lean();
      if (deduped) {
        return deduped._id.toString();
      }
    }
    throw err;
  }
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
        topicIdentifier
      );

      const existingDuplicate = await findDuplicateQuestion(normalizedPayload);
      if (existingDuplicate) {
        return res.json({
          success: true,
          duplicate: true,
          message: "Question already exists with the same fields",
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
  }
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

    const normalizeTopic = async (classId, subjectId, topicId, topicName) => {
      const rawValue = String(topicId || topicName || "").trim();
      if (!rawValue) return "";

      const cacheKey = `${classId}|${subjectId}|${rawValue.toLowerCase()}`;
      if (topicCache.has(cacheKey)) {
        return topicCache.get(cacheKey);
      }

      const resolvedId = await ensureTopicId(classId, subjectId, rawValue);
      topicCache.set(cacheKey, resolvedId);
      return resolvedId;
    };

    const prepared = await Promise.all(
      questions.map(async (question) => {
        // Ensure subQuestions is initialized for all questions
        const processedQuestion = {
          ...question,
          topicId: await normalizeTopic(
            question.classId,
            question.subjectId,
              question.topicId,
              question.topicName
          ),
        };
        
        // Initialize subQuestions as empty array if not provided
        if (!processedQuestion.subQuestions) {
          processedQuestion.subQuestions = [];
        }
        
        return processedQuestion;
      })
    );

    const { uniqueQuestions, duplicateQuestions } = await filterDuplicateQuestions(prepared);
    const inserted = uniqueQuestions.length
      ? await Question.insertMany(uniqueQuestions, { ordered: false })
      : [];
    const subQuestionCount = inserted.reduce(
      (total, question) => total + (Array.isArray(question.subQuestions) ? question.subQuestions.length : 0),
      0
    );

    res.json({
      success: true,
      createdCount: inserted.length,
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
      filter.topicId = topicId.includes(",")
        ? { $in: topicId.split(",").map((t) => t.trim()) }
        : topicId;
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
        selectedQuestionDocs.map((q) => [q._id.toString(), q])
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

// UPDATE QUESTION META (marks / difficulty)
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === "bulk-update" || id === "bulk-delete") {
      return next();
    }
    const { marks, difficulty } = req.body || {};

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

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update. Provide marks and/or difficulty",
      });
    }

    const result = await Question.findOneAndUpdate(
      {
        _id: id,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      { $set: update },
      { new: true }
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

// BULK UPDATE QUESTION META (marks / difficulty)
router.put("/bulk-update", async (req, res) => {
  try {
    const { ids, marks, difficulty } = req.body || {};

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

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update. Provide marks and/or difficulty",
      });
    }

    const result = await Question.updateMany(
      {
        _id: { $in: ids },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      { $set: update }
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

// BULK SOFT DELETE QUESTIONS
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

    const update = {
      isDeleted: true,
      deletedAt: new Date(),
    };

    if (req.user?._id) {
      update.deletedBy = req.user._id;
    }

    const result = await Question.updateMany(
      {
        _id: { $in: uniqueIds },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      { $set: update }
    );

    return res.json({
      success: true,
      message: "Questions deleted successfully",
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

      const topicCache = new Map();
      const questionType = req.query.questionType || "mcq_image";
      const normalize = (value) => String(value || "").trim();
      const hasGroupedImageRows = rows.some((row) => {
        const groupId =
          normalize(row.question_group_id) ||
          normalize(row.groupId) ||
          normalize(row.image_group_id);

        const subQuestionText =
          normalize(row.subQuestionText) ||
          normalize(row.sub_question_text);

        const subQuestionId =
          normalize(row.subQuestionId) ||
          normalize(row.sub_question_id);

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

        const cacheKey = `${classId}|${subjectId}|${rawValue.toLowerCase()}`;
        if (topicCache.has(cacheKey)) {
          return topicCache.get(cacheKey);
        }

        const resolvedId = await ensureTopicId(classId, subjectId, rawValue);
        topicCache.set(cacheKey, resolvedId);
        return resolvedId;
      };

      const questions = await Promise.all(
        rows.map(async (row, i) => {
          const subjectId = normalizeSubjectId(row.subjectId);
          const topicId = await normalizeTopic(
            row.classId,
            subjectId,
            row.topicId,
            row.topicName
          );

          const options = ["A", "B", "C", "D"].map((id) => ({
            id,
            text: row[`option${id}Text`] || "",
            mediaUrl: resolveImageDataUrl(row[`option${id}Image`]),
            isCorrect: row.correctAnswer === id,
          }));

          return {
            classId: row.classId,
            subjectId,
            topicId,
            type: row.type,
            difficulty: row.difficulty || "easy",
            marks: Number(row.marks) || 1,
            negativeMarks: Number(row.negativeMarks) || 0,
            text: row.questionText,
            media: resolveImageDataUrl(row.questionImage)
              ? [{ url: resolveImageDataUrl(row.questionImage), alt: String(row.questionImage || "") }]
              : [],
            options,
            correctAnswer: row.correctAnswer,
            subQuestions: [], // Initialize subQuestions as empty array
          };
        })
      );

      if (hasGroupedImageRows) {
        const groupedRows = new Map();
        rows.forEach((row, index) => {
          const groupId =
            normalize(row.question_group_id) ||
            normalize(row.groupId) ||
            normalize(row.image_group_id);

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
            const subjectId = normalizeSubjectId(firstRow.subjectId);
            const topicId = await normalizeTopic(
              firstRow.classId,
              subjectId,
              firstRow.topicId,
              firstRow.topicName
            );

            const questionImage =
              normalize(firstRow.questionImage) ||
              normalize(firstRow.image);

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

              const correctAnswer = normalize(row.correctAnswer);
              const options = ["A", "B", "C", "D"]
                .map((id) => ({
                  id,
                  text: row[`option${id}Text`] || row[`option_${id}`] || "",
                  mediaUrl: resolveImageDataUrl(
                    row[`option${id}Image`] || row[`option_${id}_image`] || ""
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
              classId: firstRow.classId,
              subjectId,
              topicId,
              type: firstRow.type || "mcq_image",
              difficulty: firstRow.difficulty || "easy",
              marks: subQuestions.reduce((sum, sq) => sum + (Number(sq.marks) || 0), 0),
              negativeMarks: subQuestions.reduce(
                (sum, sq) => sum + (Number(sq.negativeMarks) || 0),
                0
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
          })
        );

        const { uniqueQuestions, duplicateQuestions } = await filterDuplicateQuestions(groupedQuestions);
        const inserted = uniqueQuestions.length
          ? await Question.insertMany(uniqueQuestions, { ordered: false })
          : [];
        const subQuestionCount = inserted.reduce(
          (total, question) => total + (Array.isArray(question.subQuestions) ? question.subQuestions.length : 0),
          0
        );

        return res.json({
          success: true,
          createdCount: inserted.length,
          subQuestionCount,
          duplicateCount: duplicateQuestions.length,
          skippedCount: duplicateQuestions.length,
        });
      }

      const { uniqueQuestions, duplicateQuestions } = await filterDuplicateQuestions(questions);
      const inserted = uniqueQuestions.length
        ? await Question.insertMany(uniqueQuestions, { ordered: false })
        : [];
      const subQuestionCount = inserted.reduce(
        (total, question) => total + (Array.isArray(question.subQuestions) ? question.subQuestions.length : 0),
        0
      );

      res.json({
        success: true,
        createdCount: inserted.length,
        subQuestionCount,
        duplicateCount: duplicateQuestions.length,
        skippedCount: duplicateQuestions.length,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;

