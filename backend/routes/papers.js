/**
 * @swagger
 * tags:
 *   name: Papers
 *   description: APIs for generating and fetching exam papers
 */

/**
 * @swagger
 * /api/papers/generate:
 *   post:
 *     summary: Auto-generate a paper using template rules
 *     tags: [Papers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *             properties:
 *               templateId:
 *                 type: string
 *                 example: "675b2f9a28f1a12ab4a3c9d5"
 *     responses:
 *       200:
 *         description: Paper generated successfully
 */

/**
 * @swagger
 * /api/papers/{id}:
 *   get:
 *     summary: Get a generated paper by ID
 *     tags: [Papers]
 *     parameters:
 *       - in: path
 *         name: id
 *         description: Paper ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paper data returned
 */

/**
 * @swagger
 * /api/papers/generate/manual:
 *   post:
 *     summary: Generate paper manually by selecting questions per section
 *     tags: [Papers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *               - selectedQuestions
 *             properties:
 *               templateId:
 *                 type: string
 *                 example: "675b2f9a28f1a12ab4a3c9d5"
 *               selectedQuestions:
 *                 type: array
 *                 description: Questions grouped by sections
 *                 items:
 *                   type: object
 *                   required:
 *                     - sectionId
 *                     - questions
 *                   properties:
 *                     sectionId:
 *                       type: string
 *                       example: "sec_eng"
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "693bacb163254b8287b4aa32"
 *                         - "693baf53e6e1d0eaf861f0b3"
 *     responses:
 *       200:
 *         description: Paper generated with selected questions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 paper:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     classId:
 *                       type: string
 *                     totalMarks:
 *                       type: number
 *                     durationMinutes:
 *                       type: number
 *                     sections:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           marks:
 *                             type: number
 *                           questions:
 *                             type: array
 *                             items:
 *                               type: string
 *                     questionsSnapshot:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           questionId:
 *                             type: string
 *                           type:
 *                             type: string
 *                           text:
 *                             type: string
 *                           media:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 url:
 *                                   type: string
 *                                 alt:
 *                                   type: string
 *                           options:
 *                             type: array
 *                           subQuestions:
 *                             type: array
 *                           marks:
 *                             type: number
 *                           negativeMarks:
 *                             type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /api/papers/template/create:
 *   post:
 *     summary: Create a new paper template
 *     tags: [Papers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - classId
 *               - totalMarks
 *               - durationMinutes
 *               - sections
 *             properties:
 *               title:
 *                 type: string
 *               classId:
 *                 type: string
 *               totalMarks:
 *                 type: number
 *               durationMinutes:
 *                 type: number
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - name
 *                     - subjectId
 *                     - marks
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     subjectId:
 *                       type: string
 *                     marks:
 *                       type: number
 *     responses:
 *       200:
 *         description: Template created successfully
 */

import express from "express";
import fs from "fs";
import path from "path";
import Question from "../models/Question.js";
import PaperTemplate from "../models/PaperTemplate.js";
import PDFDocument from "pdfkit";
import Paper from "../models/Paper.js";
import UserSetting from "../models/UserSetting.js";
import { requireStaff } from "../middleware/tokenVerification.middleware.js";
const router = express.Router();

const SCHOOL_LOGO_FILENAME = "school logo.png";

const getSchoolLogoPath = () => {
  const candidates = [
    path.join(process.cwd(), "frontend", "public", SCHOOL_LOGO_FILENAME),
    path.join(process.cwd(), "..", "frontend", "public", SCHOOL_LOGO_FILENAME),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const buildQuestionUsageMap = (questionIds = []) => {
  const usageMap = new Map();

  questionIds
    .map((id) => String(id || "").trim())
    .filter(Boolean)
    .forEach((id) => {
      usageMap.set(id, (usageMap.get(id) || 0) + 1);
    });

  return usageMap;
};

const getPaperQuestionIds = (paper = {}) =>
  (paper.sections || [])
    .flatMap((section) => section.questions || [])
    .map((id) => String(id || "").trim())
    .filter(Boolean);

const applyQuestionUsageDelta = async (deltaByQuestionId = new Map()) => {
  const operations = [];
  const incrementedIds = [];

  for (const [questionId, delta] of deltaByQuestionId.entries()) {
    if (!questionId || !delta) continue;

    const update = {
      $inc: { usageCount: delta },
    };

    if (delta > 0) {
      update.$set = { lastUsedAt: new Date() };
      incrementedIds.push(questionId);
    }

    operations.push({
      updateOne: {
        filter: { _id: questionId },
        update,
      },
    });
  }

  if (operations.length === 0) return;

  await Question.bulkWrite(operations, { ordered: false });

  await Question.updateMany(
    { usageCount: { $lt: 0 } },
    { $set: { usageCount: 0 } },
  );

  if (incrementedIds.length > 0) {
    await Question.updateMany(
      {
        _id: { $in: incrementedIds },
        usageCount: { $lte: 0 },
      },
      { $set: { lastUsedAt: null } },
    );
  }
};

const applyQuestionUsageChange = async (oldQuestionIds = [], newQuestionIds = []) => {
  const oldUsage = buildQuestionUsageMap(oldQuestionIds);
  const newUsage = buildQuestionUsageMap(newQuestionIds);
  const allQuestionIds = new Set([...oldUsage.keys(), ...newUsage.keys()]);
  const deltaByQuestionId = new Map();

  allQuestionIds.forEach((questionId) => {
    const delta = (newUsage.get(questionId) || 0) - (oldUsage.get(questionId) || 0);
    if (delta !== 0) deltaByQuestionId.set(questionId, delta);
  });

  await applyQuestionUsageDelta(deltaByQuestionId);
};

// ✅ Helper function to save paper preview updated timestamp
const savePaperPreviewUpdated = async (userId) => {
  if (!userId) return;
  try {
    await UserSetting.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          paperPreviewUpdated: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn("Failed to save paper preview updated timestamp:", err.message);
  }
};

const toLocalUploadPath = (url = "") => {
  if (!url || typeof url !== "string") return null;
  if (!url.startsWith("/uploads/")) return null;

  const cleanPath = url.replace(/^\/uploads\//, "");
  const normalized = path.normalize(cleanPath);

  if (normalized.includes("..")) return null;
  return path.join(process.cwd(), "uploads", normalized);
};

const drawImageIfExists = (doc, imageUrl, options = {}) => {
  if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
    try {
      const base64Payload = imageUrl.split(",")[1] || "";
      const imageBuffer = Buffer.from(base64Payload, "base64");
      const { x, y, ...imageOptions } = options;

      if (typeof x === "number" && typeof y === "number") {
        doc.image(imageBuffer, x, y, imageOptions);
      } else {
        doc.image(imageBuffer, imageOptions);
      }

      return true;
    } catch (err) {
      console.warn("Failed to draw data URL image in export:", err.message);
      return false;
    }
  }

  const imagePath = toLocalUploadPath(imageUrl);
  if (!imagePath || !fs.existsSync(imagePath)) {
    return false;
  }

  try {
    const { x, y, ...imageOptions } = options;
    if (typeof x === "number" && typeof y === "number") {
      doc.image(imagePath, x, y, imageOptions);
    } else {
      doc.image(imagePath, imageOptions);
    }
    return true;
  } catch (err) {
    console.warn("Failed to draw image in export:", imageUrl, err.message);
    return false;
  }
};

const mergeSnapshotOptions = (snapshotOptions = [], fullOptions = []) => {
  const full = Array.isArray(fullOptions) ? fullOptions : [];
  const snap = Array.isArray(snapshotOptions) ? snapshotOptions : [];

  if (full.length === 0) return snap;
  if (snap.length === 0) return full;

  const fullById = new Map(
    full.map((option) => [String(option?.id || "").trim().toUpperCase(), option])
  );

  return snap.map((option) => {
    const fullOption = fullById.get(String(option?.id || "").trim().toUpperCase());
    if (!fullOption) return option;

    return {
      ...option,
      isCorrect: fullOption.isCorrect ?? option.isCorrect,
      text: option.text || fullOption.text || "",
      mediaUrl: option.mediaUrl || fullOption.mediaUrl || "",
    };
  });
};

const mergeSnapshotSubQuestions = (snapshotSubQuestions = [], fullSubQuestions = []) => {
  const full = Array.isArray(fullSubQuestions) ? fullSubQuestions : [];
  const snap = Array.isArray(snapshotSubQuestions) ? snapshotSubQuestions : [];

  if (full.length === 0) return snap;
  if (snap.length === 0) return full;

  return snap.map((subQuestion, index) => {
    const fullSubQuestion =
      full.find((item) => String(item?.id || "") === String(subQuestion?.id || "")) ||
      full[index] ||
      {};

    return {
      ...fullSubQuestion,
      ...subQuestion,
      options: mergeSnapshotOptions(subQuestion?.options, fullSubQuestion?.options),
      correctAnswer:
        subQuestion?.correctAnswer !== undefined && subQuestion?.correctAnswer !== null
          ? subQuestion.correctAnswer
          : fullSubQuestion?.correctAnswer,
    };
  });
};

const enrichPaperSnapshots = async (paperDoc) => {
  const paper = typeof paperDoc?.toObject === "function" ? paperDoc.toObject() : paperDoc;
  if (!paper) return null;

  const sectionQuestionIds = Array.from(
    new Set(
      (paper.sections || [])
        .flatMap((section) => section.questions || [])
        .map((qid) => String(qid))
    )
  );

  if (sectionQuestionIds.length === 0) {
    paper.questionsSnapshot = Array.isArray(paper.questionsSnapshot) ? paper.questionsSnapshot : [];
    return paper;
  }

  const sourceQuestions = await Question.find({
    _id: { $in: sectionQuestionIds },
  }).lean();

  const questionById = new Map(
    sourceQuestions.map((question) => [String(question._id), question])
  );

  const rawSnapshots = Array.isArray(paper.questionsSnapshot) ? paper.questionsSnapshot : [];
  const snapshotById = new Map(
    rawSnapshots.map((snapshot) => [
      String(snapshot?.questionId || snapshot?._id || ""),
      snapshot,
    ])
  );

  paper.questionsSnapshot = sectionQuestionIds.map((questionId) => {
    const snapshot = snapshotById.get(questionId) || {};
    const fullQuestion = questionById.get(questionId) || {};

    const snapshotSubQuestions = Array.isArray(snapshot?.subQuestions)
      ? snapshot.subQuestions
      : Array.isArray(fullQuestion?.subQuestions)
        ? fullQuestion.subQuestions
        : [];
    const fullSubQuestions = Array.isArray(fullQuestion?.subQuestions)
      ? fullQuestion.subQuestions
      : [];
    const snapshotOptions = Array.isArray(snapshot?.options)
      ? snapshot.options
      : Array.isArray(fullQuestion?.options)
        ? fullQuestion.options
        : [];
    const fullOptions = Array.isArray(fullQuestion?.options) ? fullQuestion.options : [];

    return {
      ...fullQuestion,
      ...snapshot,
      questionId,
      type: snapshot?.type || fullQuestion?.type || "",
      text: snapshot?.text || fullQuestion?.text || "",
      paragraph: snapshot?.paragraph || fullQuestion?.paragraph || "",
      subQuestions: mergeSnapshotSubQuestions(snapshotSubQuestions, fullSubQuestions),
      options: mergeSnapshotOptions(snapshotOptions, fullOptions),
      media: Array.isArray(snapshot?.media)
        ? snapshot.media
        : Array.isArray(fullQuestion?.media)
          ? fullQuestion.media
          : [],
      correctAnswer:
        snapshot?.correctAnswer !== undefined && snapshot?.correctAnswer !== null
          ? snapshot.correctAnswer
          : fullQuestion?.correctAnswer,
      matches:
        snapshot?.matches !== undefined && snapshot?.matches !== null
          ? snapshot.matches
          : fullQuestion?.matches,
      marks: snapshot?.marks ?? fullQuestion?.marks ?? 1,
      negativeMarks: snapshot?.negativeMarks ?? fullQuestion?.negativeMarks ?? 0,
    };
  });

  return paper;
};

const renderPdfOptions = (doc, options = []) => {
  if (!Array.isArray(options) || options.length === 0) return;

  const imageOnlyOptions = options.filter((opt) => opt?.mediaUrl && !opt?.text);

  if (imageOnlyOptions.length === options.length && options.length > 0) {
    const startX = doc.x + 10;
    const startY = doc.y;
    const slotWidth = 110;

    options.forEach((opt, index) => {
      const label = String.fromCharCode(65 + index);
      const x = startX + index * slotWidth;

      doc.fontSize(10).text(`${label})`, x, startY, { width: 18 });

      drawImageIfExists(doc, opt.mediaUrl, {
        x: x + 14,
        y: startY,
        fit: [78, 54],
        align: "center",
      });
    });

    doc.y = startY + 62;
    doc.moveDown(0.3);
    return;
  }

  options.forEach((opt, index) => {
    const label = String.fromCharCode(65 + index);

    if (opt?.text) {
      doc.text(`   ${label}) ${opt.text}`);
    } else {
      doc.text(`   ${label})`);
    }

    if (opt?.mediaUrl) {
      const drawn = drawImageIfExists(doc, opt.mediaUrl, {
        fit: [78, 54],
        align: "left",
      });

      if (drawn) {
        doc.moveDown(0.2);
      }
    }
  });

  doc.moveDown(0.3);
};

const renderPdfSubQuestion = (doc, subQuestion = {}, index = 0) => {
  doc.fontSize(11).text(`   ${index + 1}. ${subQuestion?.text || ""}`);
  doc.moveDown(0.2);

  // render any images attached to the sub-question (support media array or mediaUrl)
  const sqMedia = Array.isArray(subQuestion?.media)
    ? subQuestion.media
    : subQuestion?.mediaUrl
    ? [{ url: subQuestion.mediaUrl, alt: subQuestion.mediaAlt || "" }]
    : [];

  if (sqMedia.length > 0) {
    for (const img of sqMedia) {
      const drawn = drawImageIfExists(doc, img?.url || img, {
        fit: [220, 130],
        align: "left",
      });

      if (drawn) doc.moveDown(0.3);
    }
  }

  if (Array.isArray(subQuestion?.options) && subQuestion.options.length > 0) {
    renderPdfOptions(doc, subQuestion.options);
  } else if (String(subQuestion?.type || "").toLowerCase() === "true_false") {
    renderPdfOptions(doc, [
      { id: "A", text: "True" },
      { id: "B", text: "False" },
    ]);
  }

  doc.text("   Answer: __________________________");
  doc.moveDown(0.4);
};

/*
====================================
 GENERATE PAPER (MANUAL SELECTION)
====================================
*/

router.post("/generate/manual", requireStaff, async (req, res) => {
  try {
    const { templateId, selectedQuestions, paperId } = req.body;

    if (!templateId)
      return res.status(400).json({ error: "templateId is required" });

    if (!Array.isArray(selectedQuestions))
      return res
        .status(400)
        .json({ error: "selectedQuestions must be an array" });

    const template = await PaperTemplate.findById(templateId);
    if (!template) return res.status(404).json({ error: "Template not found" });

    let sections = [];
    let snapshots = [];
    let totalMarks = 0;

    for (const sec of selectedQuestions) {
      const selectedQuestionIds = Array.isArray(sec.questions)
        ? sec.questions.map((id) => String(id || "")).filter(Boolean)
        : [];
      const requestedSubQuestions = new Map(
        (Array.isArray(sec.subQuestionSelections) ? sec.subQuestionSelections : [])
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
      const qs = await Question.find({ _id: { $in: selectedQuestionIds } });

      const questionSnapshots = qs.map((q) => {
        const questionId = q._id.toString();
        const selectedSubQuestionIds = requestedSubQuestions.get(questionId);
        const allSubQuestions = Array.isArray(q.subQuestions) ? q.subQuestions : [];
        const subQuestions = selectedSubQuestionIds
          ? allSubQuestions.filter((subQuestion, index) =>
              selectedSubQuestionIds.has(String(subQuestion?._id || subQuestion?.id || index + 1))
            )
          : allSubQuestions;
        const marks = selectedSubQuestionIds
          ? subQuestions.reduce((sum, subQuestion) => sum + Math.max(0, Number(subQuestion?.marks || 0)), 0)
          : q.marks || 1;

        return { q, subQuestions, marks };
      });

      const sectionMarks = questionSnapshots.reduce((sum, question) => sum + question.marks, 0);
      totalMarks += sectionMarks;

      sections.push({
        id: sec.sectionId,
        name: template.sections.find((s) => s.id === sec.sectionId)?.name,
        marks: sectionMarks,
        questions: questionSnapshots.map(({ q }) => q._id.toString()),
      });

      questionSnapshots.forEach(({ q, subQuestions, marks }) => {
        snapshots.push({
          questionId: q._id,
          type: q.type,
          text: q.text,
          paragraph: q.paragraph,
          media: q.media,
          options: q.options,
          subQuestions,
          correctAnswer: q.correctAnswer,
          matches: q.matches,
          marks,
          negativeMarks: q.negativeMarks,
        });
      });
    }

    let paper;

    // ============================
    // EDIT EXISTING PAPER
    // ============================
    if (paperId) {
      paper = await Paper.findOne({ _id: paperId, isDeleted: false });
      if (!paper) return res.status(404).json({ error: "Paper not found" });

      const oldQuestionIds = getPaperQuestionIds(paper);

      paper.sections = sections;
      paper.questionsSnapshot = snapshots;
      paper.totalMarks = totalMarks;
      paper.updatedAt = new Date();

      await paper.save();
      await applyQuestionUsageChange(oldQuestionIds, getPaperQuestionIds(paper));
      
      // ✅ Save paper preview updated timestamp
      const userId = req.user?.id || req.user?._id || req.body.userId;
      await savePaperPreviewUpdated(userId);
    }

    // ============================
    // CREATE NEW PAPER
    // ============================
    else {
      paper = new Paper({
        title: template.title,
        classId: template.classId,
        totalMarks,
        durationMinutes: template.durationMinutes,
        templateId: template._id,
        sections,
        questionsSnapshot: snapshots,
        createdAt: new Date(),
      });

      await paper.save();
      await applyQuestionUsageChange([], getPaperQuestionIds(paper));
      
      // ✅ Save paper preview updated timestamp
      const userId = req.user?.id || req.user?._id || req.body.userId;
      await savePaperPreviewUpdated(userId);
    }

    return res.json({ success: true, paper });
  } catch (err) {
    console.error("❌ MANUAL GENERATE ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// update the paper
router.put("/:id", requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, previewSettings } = req.body;

    const paper = await Paper.findOne({ _id: id, isDeleted: false });
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    if (typeof title === "string") paper.title = title;
    if (previewSettings && typeof previewSettings === "object") {
      const fontSize = Number(previewSettings.fontSize);
      const columnCount = Number(previewSettings.columnCount);

      paper.previewSettings = {
        fontSize: Number.isFinite(fontSize) && fontSize >= 0 ? fontSize : 14,
        orientation: previewSettings.orientation === "landscape" ? "landscape" : "portrait",
        columnCount: Number.isFinite(columnCount) ? Math.min(2, Math.max(1, columnCount)) : 1,
        month: String(
          previewSettings.month || new Date().toLocaleString("en-US", { month: "long" })
        ).toUpperCase(),
        year: String(previewSettings.year || new Date().getFullYear()),
        code: String(previewSettings.code || ""),
        answerLinesEnabled: previewSettings.answerLinesEnabled !== false,
        studentInstructions: Array.isArray(previewSettings.studentInstructions)
          ? previewSettings.studentInstructions.map((line) => String(line || "").trim()).filter(Boolean)
          : [],
      };
    }
    await paper.save();

    // ✅ Save paper preview updated timestamp
    const userId = req.user?.id || req.user?._id || req.body.userId;
    await savePaperPreviewUpdated(userId);

    return res.json({ success: true, paper });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/*
====================================
 CREATE PAPER TEMPLATE
====================================
*/
router.post("/template/create", requireStaff, async (req, res) => {
  try {
    const {
      title,
      classId,
      totalMarks,
      durationMinutes,
      sections,
      type,
      difficulty,
    } = req.body;

    if (
  !title ||
  !classId ||
  totalMarks === undefined ||
  totalMarks === null ||
  durationMinutes === undefined ||
  durationMinutes === null ||
  !sections ||
  !type ||
  !difficulty
) {
  return res.status(400).json({ error: "Missing required fields" });
}
    if (!Array.isArray(sections) || sections.length === 0)
      return res
        .status(400)
        .json({ error: "Sections must be a non-empty array" });
    if (Number(totalMarks) <= 0) {
    return res.status(400).json({ error: "totalMarks must be > 0" });
    }
    if (Number(durationMinutes) <= 0) {
      return res.status(400).json({ error: "durationMinutes must be > 0" });
    }
    const template = new PaperTemplate({
      title,
      classId,
      totalMarks,
      durationMinutes,
      sections,
      type,
      difficulty,
    });

    await template.save();

    return res.json({
      success: true,
      template,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/generate", requireStaff, async (req, res) => {
  try {
    const { templateId } = req.body;

    const template = await PaperTemplate.findById(templateId);
    if (!template) return res.status(404).json({ error: "Template not found" });

    let snapshots = [];
    let sections = [];

    for (const sec of template.sections) {
      const qs = await Question.aggregate([
        { $match: { subjectId: sec.subjectId, classId: template.classId } },
        { $sample: { size: sec.marks } }, // simple: 1 mark each
      ]);

      sections.push({
        id: sec.id,
        name: sec.name,
        marks: sec.marks,
        questions: qs.map((q) => q._id.toString()),
      });

      // snapshot
      qs.forEach((q) =>
        snapshots.push({
          questionId: q._id,
          type: q.type,
          text: q.text,
          paragraph: q.paragraph,
          media: q.media,
          options: q.options,
          subQuestions: q.subQuestions,
          correctAnswer: q.correctAnswer,
          matches: q.matches,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
        })
      );
    }

    const paper = new Paper({
      title: template.title,
      classId: template.classId,
      totalMarks: template.totalMarks,
      durationMinutes: template.durationMinutes,
      sections,
      questionsSnapshot: snapshots,
      createdAt: new Date(),
    });

    await paper.save();
    await applyQuestionUsageChange([], getPaperQuestionIds(paper));
    
    // ✅ Save paper preview updated timestamp
    const userId = req.user?.id || req.user?._id || req.body.userId;
    await savePaperPreviewUpdated(userId);
    
    res.json({ success: true, paper });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/*
====================================
 GET PAPER
====================================
*/


router.get("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = {};
    const paper = await Paper.findOne({ _id: id, isDeleted: false });

    if (!paper) {
      return res
        .status(404)
        .json({ success: false, message: "Paper not found" });
    }

    const template = await PaperTemplate.findById(paper.templateId);

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    const sections = template.sections.map((sec) => ({
      id: sec.id,
      name: sec.name,
      marks: sec.marks,
      questions: paper.sections.find((s) => s.id === sec.id)?.questions || [],
      subjectId: sec.subjectId,
      // Preserve topic mark allocations so edit UI can hydrate them
      rules: sec.rules
        ? {
            marksPerQuestion: Math.max(1, Number(sec.rules.marksPerQuestion || 1)),
            topicDistributions: Array.isArray(sec.rules.topicDistributions)
              ? sec.rules.topicDistributions.map((rule) => ({
                  topicId: String(rule.topicId || ""),
                  marks: Math.max(0, Number(rule.marks || 0)),
                }))
              : [],
          }
        : { marksPerQuestion: 1, topicDistributions: [] },
    }));

    const paperData = await enrichPaperSnapshots(paper);

    res.json({ success: true, data: { paper: paperData, template, sections } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch papers",
      error: error.message,
    });
  }
});



// POST /api/papers/
router.post("/", async (req, res) => {
  try {
    const { classId, title, order = "desc", isRecent = false } = req.body;

    const filter = {};

    filter.isDeleted = false; 

    if (classId) {
      filter.classId = classId;
    }

    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }

    const sortOrder = order === "asc" ? 1 : -1;

    // ❌ DO NOT await here
    let query = Paper.find(filter).sort({ createdAt: sortOrder });

    // ✅ Apply limit conditionally
    if (isRecent) {
      query = query.limit(5);
    }

    // ✅ Await only at the end
    const papers = await query;
    const count = await Paper.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count,
      papers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch papers",
      error: error.message,
    });
  }
});

// check paper name is exist — prefer ?title= (path param kept for compatibility)
router.get(["/check", "/check/:title"], async (req, res) => {
  try {
    const title = String(req.query.title ?? req.params.title ?? "").trim();
    if (!title) {
      return res.status(200).json({
        success: true,
        message: "Paper name is required",
        isExist: false,
      });
    }

    const paper = await Paper.findOne({ title, isDeleted: false });
    return res.status(200).json({
      success: true,
      message: paper ? "Paper name already exist" : "Paper name is available",
      isExist: Boolean(paper),
    });
  } catch (err) {
    res.status(500).json({ success: false, isExist: false, error: err.message });
  }
});


// SOFT DELETE PAPER
router.delete("/:id", requireStaff, async (req, res) => {
  try {
    const { id } = req.params;

    const paper = await Paper.findOne({ _id: id, isDeleted: false });
    if (!paper) return res.status(404).json({ success: false, message: "Paper not found" });

    // already deleted? (optional)
    if (paper.isDeleted) {
      return res.json({ success: true, message: "Paper already deleted", paper });
    }

    paper.isDeleted = true;
    paper.deletedAt = new Date();

    // If verifyToken sets req.user, keep this. Otherwise remove safely.
    if (req.user?.id) paper.deletedBy = req.user.id;

    await paper.save();
    await applyQuestionUsageChange(getPaperQuestionIds(paper), []);

    return res.json({ success: true, message: "Paper deleted (soft)", paper });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


/*
====================================
 EXPORT PAPER AS PDF
====================================
*/

router.get("/export/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const paperDoc = await Paper.findOne({ _id: id, isDeleted: false });
    const paper = await enrichPaperSnapshots(paperDoc);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: "Paper not found",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${paper.title || "paper"}.pdf"`
    );

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    doc.pipe(res);

    const logoPath = getSchoolLogoPath();
    const headerTop = doc.y;
    const logoSize = 72;
    const headerGap = 12;
    const titleX = doc.page.margins.left + logoSize + headerGap;
    const titleWidth = doc.page.width - titleX - doc.page.margins.right;

    if (logoPath) {
      doc.image(logoPath, doc.page.margins.left, headerTop, {
        fit: [logoSize, logoSize],
      });
    }

    // Title
    doc.fontSize(18).text(paper.title || "Question Paper", titleX, headerTop + 18, {
      align: "center",
      width: titleWidth,
    });

    doc.y = Math.max(doc.y, headerTop + logoSize + 10);

    doc.fontSize(12).text(`Class: ${paper.classId}`);
    doc.text(`Total Marks: ${paper.totalMarks}`);
    doc.text(`Duration: ${paper.durationMinutes} minutes`);

    doc.moveDown();

    let qNo = 1;

    for (const section of paper.sections || []) {
      doc.fontSize(14).text(
        `${section.name} (${section.marks} Marks)`,
        { underline: true }
      );

      doc.moveDown(0.5);

      const ids = new Set(
        (section.questions || []).map((id) => id.toString())
      );

      const questions =
        paper.questionsSnapshot?.filter((q) =>
          ids.has(q.questionId.toString())
        ) || [];

      for (const q of questions) {
        const isParagraphQuestion =
          q?.type === "paragraph" ||
          (Array.isArray(q?.subQuestions) && q.subQuestions.length > 0) ||
          Boolean(String(q?.paragraph || "").trim());

        if (isParagraphQuestion) {
          doc.fontSize(12).text(`${qNo}.`);
          doc.moveDown(0.2);

          if (q?.text) {
            doc.fontSize(12).text(`Instruction: ${q.text}`);
            doc.moveDown(0.2);
          }

          if (q?.paragraph) {
            doc.fontSize(12).text("Paragraph:");
            doc.fontSize(11).text(q.paragraph, {
              align: "left",
            });
            doc.moveDown(0.3);
          }
        } else {
          doc.fontSize(12).text(`${qNo}. ${q.text}`);
          doc.moveDown(0.3);
        }


        if (Array.isArray(q.media) && q.media.length > 0) {
          q.media.forEach((img) => {
            const drawn = drawImageIfExists(doc, img?.url, {
              fit: [220, 130],
              align: "left",
            });

            if (drawn) {
              doc.moveDown(0.3);
            }
          });
        }

        if (isParagraphQuestion) {
          const subQuestions = Array.isArray(q?.subQuestions) ? q.subQuestions : [];

          subQuestions.forEach((subQuestion, subIndex) => {
            renderPdfSubQuestion(doc, subQuestion, subIndex);
          });
        } else if (q.options?.length) {
          renderPdfOptions(doc, q.options);
        }

        qNo++;
        doc.moveDown(0.5);
      }

      doc.moveDown();
    }

    doc.end();
  } catch (error) {
    console.error("EXPORT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Export failed",
      error: error.message,
    });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const paperDoc = await Paper.findOne({ _id: req.params.id, isDeleted: false });
    const paper = await enrichPaperSnapshots(paperDoc);
    res.json({ success: true, paper });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});




export default router;
