/**
 * @swagger
 * /api/templates/{id}/preview:
 *   get:
 *     summary: Preview template with question counts
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Template preview
 */
/**
 * @swagger
 * /api/templates/validate:
 *   post:
 *     summary: Validate template fields & marks
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: Validation successful
 */
/**
 * @swagger
 * /api/templates/duplicate/{id}:
 *   post:
 *     summary: Duplicate a template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Template duplicated
 */


import PaperTemplate from "../models/PaperTemplate";
import Question from "../models/Question";
import express from "express";
const router = express.Router();

// PREVIEW TEMPLATE – Count questions available //-----/api/templates/:id/preview
router.get("/:id/preview", async (req, res) => {
  try {
    const template = await PaperTemplate.findById(req.params.id);
    if (!template)
      return res.status(404).json({ success: false, error: "Template not found" });

    const previewSections = [];

    for (const sec of template.sections) {
      const totalAvailable = await Question.countDocuments({
        classId: template.classId,
        subjectId: sec.subjectId
      });

      previewSections.push({
        id: sec.id,
        name: sec.name,
        required: sec.marks,
        available: totalAvailable,
        isEnough: totalAvailable >= sec.marks
      });
    }

    res.json({
      success: true,
      templateId: template._id,
      title: template.title,
      classId: template.classId,
      sections: previewSections
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.post("/validate", async (req, res) => {
  try {
    const template = req.body;

    // Validate marks total
    const totalSectionMarks = template.sections.reduce(
      (sum, sec) => sum + sec.marks,
      0
    );

    if (totalSectionMarks !== template.totalMarks) {
      return res.status(400).json({
        success: false,
        error: `Section marks (${totalSectionMarks}) do not match totalMarks (${template.totalMarks}).`
      });
    }

    // Validate question count availability // ------------/api/templates/validate
    const validation = [];

    for (const sec of template.sections) {
      const available = await Question.countDocuments({
        classId: template.classId,
        subjectId: sec.subjectId
      });

      validation.push({
        sectionId: sec.id,
        sectionName: sec.name,
        required: sec.marks,
        available,
        isEnough: available >= sec.marks
      });
    }

    res.json({
      success: true,
      message: "Template validation completed.",
      validation
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// /api/templates/duplicate/:id
router.post("/duplicate/:id", async (req, res) => {
  try {
    const oldTemplate = await PaperTemplate.findById(req.params.id);
    if (!oldTemplate)
      return res.status(404).json({ success: false, error: "Template not found" });

    const newTemplate = new PaperTemplate({
      title: `${oldTemplate.title} (Copy)`,
      classId: oldTemplate.classId,
      totalMarks: oldTemplate.totalMarks,
      durationMinutes: oldTemplate.durationMinutes,
      sections: oldTemplate.sections,
      createdAt: new Date()
    });

    await newTemplate.save();

    res.json({
      success: true,
      message: "Template duplicated successfully",
      template: newTemplate
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;