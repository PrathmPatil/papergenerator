import jwt from "jsonwebtoken";

/* =========================
   Verify JWT Token
========================= */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization token missing",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role, // optional (if added in token)
    };

    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/* =========================
   Authorize Admin Only
========================= */
export const verifyAdmin = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "master" && role !== "administrative") {
    return res.status(403).json({
      success: false,
      message: "Administrative access required",
    });
  }
  next();
};

/* =========================
   Authorize Same User OR Admin
========================= */
export const authorizeUser = (req, res, next) => {
  const { userId } = req.params;
  const role = String(req.user?.role || "").toLowerCase();
  const isAdminRole = role === "master" || role === "administrative";

  if (req.user.id !== userId && !isAdminRole) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to perform this action",
    });
  }

  next();
};
