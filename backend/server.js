import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// ⭐ VERY IMPORTANT — ADD .js extension
import questionRoutes from "./routes/questions.js";
import topicRoutes from "./routes/topics.js";
import paperRoutes from "./routes/papers.js";
import templateRoutes from "./routes/template.js";
import pdfConversionRoutes from "./routes/pdfConversion.js";
import userRoutes from "./routes/users.js";
import userSettingRoutes from "./routes/userSetting.js"
import { swaggerDocs } from "./swagger.js";
import { requireStaff, verifyToken } from "./middleware/tokenVerification.middleware.js";
import { seedMasterUser } from "./master.seed.js";
import { apiRateLimiter, authRateLimiter } from "./middleware/rateLimit.middleware.js";


dotenv.config();

const app = express();
app.set("trust proxy", 1);
const port = Number(process.env.PORT || process.env.BACKEND_PORT || 5000);

// ⭐ REQUIRED for form-data + JSON
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "100mb";
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

app.use(cors());
app.use("/uploads", express.static("uploads"));

// Apply stricter limits on auth endpoints to reduce brute-force attempts.
app.use("/api/users/login", authRateLimiter);
app.use("/api/users/register", authRateLimiter);

// Apply shared API rate limiting for all API routes.
app.use("/api", apiRateLimiter);

if (process.env.LOG_REQUESTS === "true") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// ⭐ REGISTER ROUTES
app.use("/api/questions", verifyToken, requireStaff, questionRoutes);
app.use("/api/topics", verifyToken, requireStaff, topicRoutes);
app.use("/api/papers",verifyToken, paperRoutes);
app.use("/api/templates", verifyToken, requireStaff, templateRoutes);
app.use("/api/pdf-conversion", verifyToken, requireStaff, pdfConversionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/setting",userSettingRoutes)

app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: `Upload is too large. Current request body limit is ${requestBodyLimit}.`,
    });
  }

  return next(err);
});

app.post("/ping", (req, res) => {
  res.json({ ok: true });
});

// /api/hello
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from server!" });
});

mongoose
  .connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(async () =>{ console.log("MongoDB connected"); await seedMasterUser(); })
  .catch((err) => console.error(err));

swaggerDocs(app);  

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
