const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;

  if (!token) return res.status(401).json({ message: "Authentication is required" });

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Your session is invalid or has expired" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  const allowedRoles = roles.map((role) => role.toLowerCase());
  const userRoles = (req.auth?.roles || []).map((role) => String(role).toLowerCase());
  if (!userRoles.some((role) => allowedRoles.includes(role))) {
    return res.status(403).json({ code: "ADMIN_REQUIRED", message: "Admin permission is required for this action" });
  }
  next();
};

module.exports = { requireAuth, requireRole };
