import express from "express";
import Topic from "../models/Topic.js";

const router = express.Router();

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

    const topics = await Topic.find({ classId, subjectId })
      .sort({ nameLower: 1 }) // sort A-Z
      .lean();

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

    const nameLower = cleanName.toLowerCase();

    // If already exists, return it (idempotent)
    const existing = await Topic.findOne({ classId, subjectId, nameLower });
    if (existing) {
      return res.status(200).json({ topic: existing, existed: true });
    }

    const topic = await Topic.create({
      name: cleanName,
      nameLower,
      classId,
      subjectId,
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