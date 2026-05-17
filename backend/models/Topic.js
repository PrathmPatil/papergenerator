import mongoose from "mongoose";

const TopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true, trim: true }, // normalized key used for uniqueness
    classId: { type: String, required: true },
    subjectId: { type: String, required: true },
  },
  { timestamps: true }
);

// Normalize topic name to a stable key used for deduplication
function normalizeTopicKey(raw = "") {
  return String(raw || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Ensure `nameLower` is always a normalized value before saving
TopicSchema.pre("save", function () {
  if (this.name) {
    this.nameLower = normalizeTopicKey(this.name);
    return;
  }

  if (this.nameLower) {
    this.nameLower = normalizeTopicKey(this.nameLower);
  }
});

// Case-insensitive unique topic per class+subject using normalized key
TopicSchema.index({ classId: 1, subjectId: 1, nameLower: 1 }, { unique: true });

export default mongoose.model("Topic", TopicSchema);