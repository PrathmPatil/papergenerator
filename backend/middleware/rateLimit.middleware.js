import rateLimit from "express-rate-limit";

const buildLimiter = ({ windowMs, max, name }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfterSeconds = Math.ceil(windowMs / 1000);
      res.status(429).json({
        success: false,
        message: `Too many requests for ${name}. Please try again later.`,
        retryAfter: retryAfterSeconds,
      });
    },
  });

const apiWindowMs = Number(process.env.RATE_LIMIT_API_WINDOW_MS || 15 * 60 * 1000);
const apiMax = Number(process.env.RATE_LIMIT_API_MAX || 300);

const authWindowMs = Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 15 * 60 * 1000);
const authMax = Number(process.env.RATE_LIMIT_AUTH_MAX || 20);

export const apiRateLimiter = buildLimiter({
  windowMs: apiWindowMs,
  max: apiMax,
  name: "API",
});

export const authRateLimiter = buildLimiter({
  windowMs: authWindowMs,
  max: authMax,
  name: "auth",
});
