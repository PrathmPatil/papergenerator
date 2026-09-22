import express from "express";
import ActivityLog from "../models/ActivityLog.js";
import { verifyAdmin, verifyToken } from "../middleware/tokenVerification.middleware.js";

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const q = String(req.query.q || "").trim();
    const action = String(req.query.action || "").trim();

    const filter = {};
    if (action) filter.action = action;
    if (q) {
      filter.$or = [
        { userEmail: { $regex: q, $options: "i" } },
        { userName: { $regex: q, $options: "i" } },
        { ip: { $regex: q, $options: "i" } },
        { path: { $regex: q, $options: "i" } },
        { action: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email role")
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
