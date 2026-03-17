import mongoose from "mongoose";

const TopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true, trim: true }, // ✅ add this
    classId: { type: String, required: true },
    subjectId: { type: String, required: true },
  },
  { timestamps: true }
);

// ✅ Case-insensitive unique topic per class+subject
TopicSchema.index({ classId: 1, subjectId: 1, nameLower: 1 }, { unique: true });

export default mongoose.model("Topic", TopicSchema);