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
import Question from "../models/Question.js";
import PaperTemplate from "../models/PaperTemplate.js";
import Paper from "../models/Paper.js";
const router = express.Router();

/*
====================================
 GENERATE PAPER (MANUAL SELECTION)
====================================
*/

router.post("/generate/manual", async (req, res) => {
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
      const qs = await Question.find({ _id: { $in: sec.questions } });

      const sectionMarks = qs.reduce((sum, q) => sum + (q.marks || 1), 0);
      totalMarks += sectionMarks;

      sections.push({
        id: sec.sectionId,
        name: template.sections.find((s) => s.id === sec.sectionId)?.name,
        marks: sectionMarks,
        questions: qs.map((q) => q._id.toString()),
      });

      qs.forEach((q) => {
        snapshots.push({
          questionId: q._id,
          type: q.type,
          text: q.text,
          media: q.media,
          options: q.options,
          subQuestions: q.subQuestions,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
        });
      });
    }

    let paper;

    // ============================
    // EDIT EXISTING PAPER
    // ============================
    if (paperId) {
      paper = await Paper.findById(paperId);
      if (!paper) return res.status(404).json({ error: "Paper not found" });

      paper.sections = sections;
      paper.questionsSnapshot = snapshots;
      paper.totalMarks = totalMarks;
      paper.updatedAt = new Date();

      await paper.save();
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
    }

    return res.json({ success: true, paper });
  } catch (err) {
    console.error("❌ MANUAL GENERATE ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// update the paper
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const paper = await Paper.findById(id);
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    paper.title = title;
    await paper.save();

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
router.post("/template/create", async (req, res) => {
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
      !totalMarks ||
      !durationMinutes ||
      !sections ||
      !type ||
      !difficulty
    )
      return res.status(400).json({ error: "Missing required fields" });

    if (!Array.isArray(sections) || sections.length === 0)
      return res
        .status(400)
        .json({ error: "Sections must be a non-empty array" });

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

router.post("/generate", async (req, res) => {
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
          media: q.media,
          options: q.options,
          subQuestions: q.subQuestions,
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

router.get("/:id", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    res.json({ success: true, paper });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = {};
    const paper = await Paper.findById(id);

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
    }));

    res.json({ success: true, data: { paper, template, sections } });
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

// check paper name is exist
router.get("/check/:title", async (req, res) => {
  try {
    const { title } = req.params;
    const paper = await Paper.findOne({ title });
    if (paper)
      return res.json({
        success: false,
        message: "Paper name already exist",
        isExist: true,
      });
    res
      .status(200)
      .json({
        success: true,
        message: "Paper name is available",
        isExist: false,
      });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
