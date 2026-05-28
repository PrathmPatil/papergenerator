import express from "express";
import { authorizeUser, verifyToken } from "../middleware/tokenVerification.middleware.js";
import User from "../models/User.js";
import UserSetting from "../models/UserSetting.js";

const router = express.Router();

router.get("/:userId/settings", verifyToken, authorizeUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const settings = await UserSetting.findOne({ userId: req.params.userId });
    res.json({ success: true, data: { user, settings } });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
});

router.put("/:userId/notifications", verifyToken, authorizeUser, async (req, res) => {
  try {
    const existing = await UserSetting.findOne({ userId: req.params.userId });
    const notifications = {
      ...(existing?.notifications?.toObject?.() || {}),
      ...req.body,
    };

    await UserSetting.findOneAndUpdate(
      { userId: req.params.userId },
      {
        $set: {
          userId: req.params.userId,
          notifications,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: "Notifications updated" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});


router.put("/:userId/theme", verifyToken, authorizeUser, async (req, res) => {
  try {
    const theme = String(req.body.theme || "").toLowerCase();
    if (!["light", "dark", "auto"].includes(theme)) {
      return res.status(400).json({
        success: false,
        message: "Theme must be one of light, dark, auto",
      });
    }

    await UserSetting.findOneAndUpdate(
      { userId: req.params.userId },
      {
        $set: {
          userId: req.params.userId,
          theme,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: "Theme updated" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
