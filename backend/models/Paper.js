import mongoose from "mongoose";

const SnapshotOptionSchema = new mongoose.Schema({
  id: String,
  text: String,
  mediaUrl: String,
  isCorrect: Boolean,
}, { _id: false });

const SnapshotSubQuestionSchema = new mongoose.Schema({
  id: String,
  type: String,
  text: String,
  mediaUrl: String,
  options: [SnapshotOptionSchema],
  marks: Number,
  negativeMarks: Number,
  correctAnswer: mongoose.Schema.Types.Mixed,
}, { _id: false });

const SnapshotQuestionSchema = new mongoose.Schema({
  questionId: String,
  type: String,
  text: String,
  paragraph: String,
  media: [{ url: String, alt: String }],
  options: [SnapshotOptionSchema],
  subQuestions: [SnapshotSubQuestionSchema],
  correctAnswer: mongoose.Schema.Types.Mixed,
  matches: mongoose.Schema.Types.Mixed,
  marks: Number,
  negativeMarks: Number
}, { _id: false });

const SectionSchema = new mongoose.Schema({
  id: String,
  name: String,
  marks: Number,
  questions: [String]
}, { _id: false });

const PaperSchema = new mongoose.Schema({
  title: String,
  code: String,
  classId: String,
  totalMarks: Number,
  durationMinutes: Number,
  date: Date,

  templateId: String,
  sections: [SectionSchema],
  questionsSnapshot: [SnapshotQuestionSchema],

  generatedBy: String,

  // ✅ Soft delete fields (ADD)
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  createdAt: { type: Date, default: Date.now }
});


export default mongoose.model("Paper", PaperSchema);
