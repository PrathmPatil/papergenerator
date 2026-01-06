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
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("PaperTemplate", PaperTemplateSchema);
