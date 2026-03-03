import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, default: "" },
  email: { type: String, required: true, default: "", unique: true },
  role: { type: String, required: true, default: "student" },
  phone: { type: String,  default: "" },
  institution:{type:String,  default: "" },
  isActive: { type: Boolean, required: true, default: true },
  isDeleted: { type: Boolean, required: true, default: false },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
  password: { type: String, required: true, select: false },
  // ✅ Soft delete fields (ADD)
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

export default mongoose.model("User", userSchema);
