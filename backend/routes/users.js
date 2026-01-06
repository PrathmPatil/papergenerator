import User from "../models/User.js";
import express from "express";
const router = express.Router();
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/tokenVerification.middleware.js";


router.post("/register",verifyToken, async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    const existingUser = await User.findOne({ email });
    // CASE 1: User exists and NOT deleted
    if (existingUser && !existingUser.isDeleted) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // CASE 2: User exists but SOFT DELETED → RESTORE
    if (existingUser && existingUser.isDeleted) {
      existingUser.name = name;
      existingUser.role = role;
      existingUser.password = hashedPassword;
      existingUser.isDeleted = false;
      existingUser.isActive = true;

      await existingUser.save();

      return res.status(200).json({
        success: true,
        message: "User account restored successfully",
      });
    }

    // CASE 3: New user
    await User.create({
      name,
      email,
      role,
      password: hashedPassword,
      isDeleted: false,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Account is deleted. Please contact admin.",
      });
    }

    if (!user.password) {
      return res.status(500).json({
        success: false,
        message: "Password not set. Please reset password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    console.log(process.env.JWT_SECRET)
    // send the token 
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// get all the user
router.get("/",verifyToken, async (req, res) => {
  try {
    const users = await User.find()
      .where({ isDeleted: false })
      .sort({ createdAt: -1 });
    res.status(200).json({
      data: users,
      success: true,
      message: "Users fetched successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// get single user by id
router.get("/:id",verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/:id",verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  try {
    const checkUser = await User.findById(id);
    if (!checkUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (!checkUser.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "User is not active" });
    }
    if (checkUser.isDeleted) {
      return res
        .status(400)
        .json({ success: false, message: "User is deleted" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        name,
        email,
        role,
        updatedAt: new Date(),
      },
      { new: true }
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "User updated successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/:id/is-active",verifyToken, async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const checkUser = await User.findById(id);
    if (!checkUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (checkUser.isDeleted) {
      return res
        .status(400)
        .json({ success: false, message: "User is deleted" });
    }
    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      message: "User is active status updated successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/:id/is-deleted",verifyToken, async (req, res) => {
  const { id } = req.params;
  const { isDeleted } = req.body;
  try {
    const checkUser = await User.findById(id);
    if (!checkUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const user = await User.findByIdAndUpdate(id, { isDeleted }, { new: true });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      message: "User is deleted status updated successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
