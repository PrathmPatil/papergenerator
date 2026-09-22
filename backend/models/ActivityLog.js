import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userEmail: { type: String, default: "", index: true },
    userName: { type: String, default: "" },
    userRole: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    method: { type: String, default: "" },
    path: { type: String, default: "" },
    statusCode: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    ip: { type: String, default: "", index: true },
    userAgent: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema);
