import express from "express";
import { verifyToken } from "../middleware/tokenVerification.middleware.js";
import User from "../models/User.js";
import UserSetting from "../models/UserSetting.js";

const router = express.Router();

router.get("/:userId/settings", verifyToken, async (req, res) => {
  try {

    const user = await User.findById(req.params.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
});

router.put("/:userId/notifications", verifyToken, async (req, res) => {
  try {

    await UserSetting.findByIdAndUpdate(req.params.userId, {
      notifications: req.body,
    });

    res.json({ success: true, message: "Notifications updated" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});


router.put("/:userId/theme", verifyToken, async (req, res) => {
  try {

    await UserSetting.findByIdAndUpdate(req.params.userId, {
      theme: req.body.theme,
    });

    res.json({ success: true, message: "Theme updated" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
