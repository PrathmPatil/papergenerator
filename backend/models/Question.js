import mongoose from "mongoose";

// For MCQ Options
const OptionSchema = new mongoose.Schema({
  id: String,
  text: String,            // used when option has text
  mediaUrl: String,        // used when option is an image
  isCorrect: Boolean
});

// For sub-questions (used in paragraph type questions)
const SubQuestionSchema = new mongoose.Schema({
  id: String,
  type: String,
  text: String,
  mediaUrl: String,
  options: [OptionSchema],
  marks: Number,
  negativeMarks: Number,
  correctAnswer: mongoose.Mixed
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["mcq_text", "mcq_image", "paragraph", "short_answer", "true_false", "matching"],
    required: true
  },

  classId: { type: String, required: true },
  subjectId: { type: String, required: true },
  topicId: { type: String, required: false },

  text: String,               // question text
  paragraph: String,          // for paragraph type questions
  media: [{                   // array of images (if question is in image format)
    url: String,
    alt: String,
    mimeType: String
  }],

  options: [OptionSchema],    // for MCQ
  subQuestions: [SubQuestionSchema], // for paragraph questions

  correctAnswer: mongoose.Mixed,     // for short-answer, true/false, matching
  matches: mongoose.Mixed,           // for matching questions

  marks: Number,
  negativeMarks: Number,
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "easy"
  },

  createdAt: { type: Date, default: Date.now },

  // OCR Support (optional)
  ocrText: String,
  ocrConfidence: Number,
  needsReview: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
});

export default mongoose.model("Question", QuestionSchema);
