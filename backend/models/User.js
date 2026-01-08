import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, default: "" },
  email: { type: String, required: true, default: "", unique: true },
  role: { type: String, required: true, default: "student" },
  isActive: { type: Boolean, required: true, default: true },
  isDeleted: { type: Boolean, required: true, default: false },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
  password: { type: String, required: true, select: false },
  phone: { type: String, required: true, default: "" },
  institution: { type: String, required: true, default: "" },
});

export default mongoose.model("User", userSchema);
