import ActivityLog from "../models/ActivityLog.js";

const SENSITIVE_KEY = /password|token|secret|authorization|cookie|clientPublicIp/i;
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

const normalizeIp = (raw) => {
  if (raw == null) return "";
  let ip = String(raw).trim();
  if (!ip) return "";
  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  }
  const portMatch = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (portMatch) ip = portMatch[1];
  if (ip.toLowerCase().startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") return "127.0.0.1";
  return ip;
};

const isValidIPv4 = (ip) => {
  if (!IPV4.test(ip)) return false;
  return ip.split(".").every((part) => {
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
};

const isValidIp = (ip) => {
  if (!ip) return false;
  if (isValidIPv4(ip)) return true;
  return ip.includes(":");
};

const isLoopbackIp = (ip) =>
  ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "::1" || ip === "localhost";

const isPrivateIp = (ip) => {
  if (!ip || isLoopbackIp(ip)) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1]);
    return second >= 16 && second <= 31;
  }
  const lower = ip.toLowerCase();
  return lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
};

const pushIps = (bucket, value) => {
  if (value == null) return;
  const parts = Array.isArray(value) ? value : String(value).split(",");
  parts.forEach((part) => {
    const ip = normalizeIp(part);
    if (ip) bucket.push(ip);
  });
};

export const getClientIp = (req) => {
  const headers = req?.headers || {};
  const collected = [];
  pushIps(collected, headers["cf-connecting-ip"]);
  pushIps(collected, headers["true-client-ip"]);
  pushIps(collected, headers["x-real-ip"]);
  pushIps(collected, headers["x-forwarded-for"]);
  pushIps(collected, req?.ip);
  pushIps(collected, req?.socket?.remoteAddress);
  pushIps(collected, req?.connection?.remoteAddress);

  const unique = [...new Set(collected.filter(isValidIp))];
  const publicFromRequest = unique.find((ip) => !isPrivateIp(ip));
  if (publicFromRequest) return publicFromRequest;

  const claimed = normalizeIp(headers["x-client-public-ip"] || req?.body?.clientPublicIp);
  if (isValidIp(claimed) && !isPrivateIp(claimed) && unique.every(isPrivateIp)) {
    return claimed;
  }

  return unique[0] || "";
};

let cachedWanIp = "";
let cachedWanAt = 0;

const lookupWanIp = async () => {
  if (cachedWanIp && Date.now() - cachedWanAt < 10 * 60 * 1000) return cachedWanIp;
  const response = await fetch("https://api.ipify.org?format=json");
  const data = await response.json();
  const ip = normalizeIp(data?.ip);
  if (!isValidIp(ip) || isPrivateIp(ip)) return "";
  cachedWanIp = ip;
  cachedWanAt = Date.now();
  return ip;
};

export const resolveClientIp = async (req) => {
  const ip = getClientIp(req);
  if (ip && !isPrivateIp(ip)) return ip;
  if (ip && !isLoopbackIp(ip) && !ip.startsWith("172.")) return ip;
  try {
    const wan = await lookupWanIp();
    if (wan) return wan;
  } catch {
    /* keep request IP */
  }
  return ip;
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
    const ip = await resolveClientIp(req);
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
      ip,
      userAgent: String(req?.headers?.["user-agent"] || ""),
      details: sanitizeValue({ ...details, ip }),
    });
  } catch (error) {
    console.error("Activity log failed:", error?.message || error);
  }
};
