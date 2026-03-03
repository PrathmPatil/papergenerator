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
import Question from "../models/Question.js";
import { normalizeQuestionPayload } from "../middleware/normalizeImageQuestion.middleware.js";
import XLSX from "xlsx";
import fs from "fs-extra";
import unzipper from "unzipper";

router.post("/test", (req, res) => {
  console.log("🔥 TEST ROUTE HIT");
  console.log("BODY:", req.body);
  res.json({ message: "OK" });
});

// Local upload folder (production: use S3)
const upload = multer({ dest: "uploads/" });

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
      const q = new Question(req.normalizedPayload);
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

    // validation + insert logic
    const inserted = await Question.insertMany(questions, { ordered: false });

    res.json({
      success: true,
      createdCount: inserted.length,
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

    if (topicId) filter.topicId = topicId;

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

router.post(
  "/bulk-image-upload",
  upload.fields([
    { name: "excel", maxCount: 1 },
    { name: "images", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const excelFile = req.files.excel[0];
      const zipFile = req.files.images[0];

      // extract images
      await fs
        .createReadStream(zipFile.path)
        .pipe(unzipper.Extract({ path: "uploads/" }))
        .promise();

      // parse excel
      const workbook = XLSX.readFile(excelFile.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const questions = rows.map((row, i) => {
        const options = ["A", "B", "C", "D"].map((id) => ({
          id,
          text: row[`option${id}Text`] || "",
          mediaUrl: row[`option${id}Image`]
            ? `/uploads/${row[`option${id}Image`]}`
            : "",
          isCorrect: row.correctAnswer === id,
        }));

        return {
          classId: row.classId,
          subjectId: row.subjectId,
          topicId: row.topicId || "",
          type: row.type,
          difficulty: row.difficulty || "easy",
          marks: Number(row.marks) || 1,
          negativeMarks: Number(row.negativeMarks) || 0,
          text: row.questionText,
          media: row.questionImage
            ? [{ url: `/uploads/${row.questionImage}` }]
            : [],
          options,
          correctAnswer: row.correctAnswer,
        };
      });

      const inserted = await Question.insertMany(questions, { ordered: false });

      res.json({
        success: true,
        createdCount: inserted.length,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// SOFT DELETE QUESTION
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    // already deleted?
    if (question.isDeleted) {
      return res.json({
        success: true,
        message: "Question already deleted",
        question,
      });
    }

    question.isDeleted = true;
    question.deletedAt = new Date();

    // if you have auth middleware setting req.user
    if (req.user?._id) question.deletedBy = req.user._id;

    await question.save();

    return res.json({
      success: true,
      message: "Question deleted (soft)",
      question,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
