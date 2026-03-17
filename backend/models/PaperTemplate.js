import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema({
  id: String,
  name: String,
  subjectId: String,
  marks: Number,
  rules: mongoose.Mixed  // topic distribution, difficulty distribution etc
}, { _id: false });

const PaperTemplateSchema = new mongoose.Schema({
  title: String,
  classId: String,
  totalMarks: Number,
  durationMinutes: Number,
  difficulty: String,
  type: String,
  sections: [SectionSchema],

  // ✅ Soft delete fields (ADD)
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("PaperTemplate", PaperTemplateSchema);
