import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  emailNotifications: { type: Boolean, default: true },
  paperReminders: { type: Boolean, default: true },
  resultNotifications: { type: Boolean, default: true },
  systemUpdates: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    userId: String,
    phone: String,
    institution: String,
    theme: {
      type: String,
      enum: ["light", "dark", "auto"],
      default: "light",
    },

    notifications: notificationSchema,
  },
  { timestamps: true }
);

export default mongoose.model("UserSetting", userSchema);
