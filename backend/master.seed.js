import bcrypt from "bcrypt";
import User from "./models/User.js";

export const seedMasterUser = async () => {
  try {
    const existingMaster = await User.findOne({ email: "master@gmail.com" });

    if (existingMaster) {
      return;
    }

    const hashedPassword = await bcrypt.hash("Master@123", 10);

    await User.create({
      name: "Master",
      email: "master@gmail.com",
      password: hashedPassword,
      role: "master",
      institution: "PVPIT",
      phone: "7030362818",
      isActive: true,
      isDeleted: false,
    });

  } catch (error) {
    console.error("❌ Error seeding master user:", error.message);
  }
};
