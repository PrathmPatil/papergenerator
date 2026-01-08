import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// ⭐ VERY IMPORTANT — ADD .js extension
import questionRoutes from "./routes/questions.js";
import paperRoutes from "./routes/papers.js";
import userRoutes from "./routes/users.js";
import userSettingRoutes from "./routes/userSetting.js"
import { swaggerDocs } from "./swagger.js";
import { verifyToken } from "./middleware/tokenVerification.middleware.js";
import { seedMasterUser } from "./master.seed.js";


dotenv.config();

const app = express();

// ⭐ REQUIRED for form-data + JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use("/uploads", express.static("uploads"));

// Debug all incoming requests
app.use((req, res, next) => {
  console.log("➡", req.method, req.url);
  next();
});

// ⭐ REGISTER ROUTES
app.use("/api/questions",verifyToken, questionRoutes);
app.use("/api/papers",verifyToken, paperRoutes);
app.use("/api/users", userRoutes);
app.use("/api/setting",userSettingRoutes)

app.post("/ping", (req, res) => {
  console.log("🔥 PING HIT");
  console.log(req.body);
  res.json({ ok: true });
});

// /api/hello
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from server!" });
});

mongoose
  .connect("mongodb://127.0.0.1:27017/papergenerator")
  .then(async () =>{ console.log("MongoDB connected"); await seedMasterUser(); })
  .catch((err) => console.error(err));

swaggerDocs(app);  

app.listen(5000, () => {
  console.log("Server running at http://localhost:5000");
});
