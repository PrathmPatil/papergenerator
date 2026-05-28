import bcrypt from "bcrypt";
import User from "./models/User.js";

export const seedMasterUser = async () => {
  try {
    const masterEmail = process.env.MASTER_USER_EMAIL;
    const masterPassword = process.env.MASTER_USER_PASSWORD;

    if (!masterEmail || !masterPassword) {
      console.warn("Skipping master user seed. Configure MASTER_USER_EMAIL and MASTER_USER_PASSWORD to enable it.");
      return;
    }

    if (masterPassword.length < 8) {
      console.warn("Skipping master user seed. MASTER_USER_PASSWORD must be at least 8 characters.");
      return;
    }

    const existingMaster = await User.findOne({ email: masterEmail });

    if (existingMaster) {
      return;
    }

    const hashedPassword = await bcrypt.hash(masterPassword, 10);

    await User.create({
      name: process.env.MASTER_USER_NAME || "Master",
      email: masterEmail,
      password: hashedPassword,
      role: "master",
      institution: process.env.MASTER_USER_INSTITUTION || "",
      phone: process.env.MASTER_USER_PHONE || "",
      isActive: true,
      isDeleted: false,
    });

  } catch (error) {
    console.error("❌ Error seeding master user:", error.message);
  }
};
