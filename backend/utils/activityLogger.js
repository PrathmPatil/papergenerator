import ActivityLog from "../models/ActivityLog.js";

const SENSITIVE_KEY = /password|token|secret|authorization|cookie/i;

export const getClientIp = (req) => {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(",")[0].trim();
  }
  return (
    req.ip ||
    req.headers?.["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    ""
  );
};

const sanitizeValue = (value, depth = 0) => {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = "[redacted]";
      } else {
        out[key] = sanitizeValue(nested, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }
  return value;
};

export const logActivity = async ({
  req,
  action,
  statusCode = 0,
  success = true,
  user,
  details = {},
}) => {
  try {
    const actor = user || req?.user || {};
    await ActivityLog.create({
      userId: actor.id || actor._id || null,
      userEmail: String(actor.email || details.email || "").toLowerCase(),
      userName: String(actor.name || ""),
      userRole: String(actor.role || ""),
      action,
      method: String(req?.method || ""),
      path: String((req?.originalUrl || req?.url || "").split("?")[0]),
      statusCode,
      success,
      ip: getClientIp(req),
      userAgent: String(req?.headers?.["user-agent"] || ""),
      details: sanitizeValue(details),
    });
  } catch (error) {
    console.error("Activity log failed:", error?.message || error);
  }
};
