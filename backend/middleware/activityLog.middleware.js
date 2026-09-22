import { logActivity } from "../utils/activityLogger.js";
import User from "../models/User.js";

const SKIP_PREFIXES = ["/api/activity-logs", "/api/hello"];

const isWriteMethod = (method) =>
  ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "").toUpperCase());

export const activityLogMiddleware = (req, res, next) => {
  const path = String((req.originalUrl || req.url || "").split("?")[0]);
  if (!isWriteMethod(req.method) || SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return next();
  }
  if (path === "/api/users/login") {
    return next();
  }

  const started = Date.now();
  res.on("finish", () => {
    const statusCode = res.statusCode || 0;
    void (async () => {
      let user = req.user;
      if (user?.id && !user.email) {
        try {
          const doc = await User.findById(user.id).select("name email role").lean();
          if (doc) {
            user = {
              id: doc._id,
              name: doc.name,
              email: doc.email,
              role: doc.role,
            };
          }
        } catch {
          /* keep token user */
        }
      }
      await logActivity({
        req,
        user,
        action: `${req.method} ${path}`,
        statusCode,
        success: statusCode < 400,
        details: {
          params: req.params,
          query: req.query,
          body: req.body,
          durationMs: Date.now() - started,
        },
      });
    })();
  });

  next();
};
