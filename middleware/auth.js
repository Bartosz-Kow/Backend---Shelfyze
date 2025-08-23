const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return next();

  const token = h.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // rozpoznaj rolę po polach tokena
    if (payload.isAdmin) {
      req.user = { id: payload.adminId, role: "admin" };
    } else {
      req.user = { id: payload.userId, role: "user" };
    }
  } catch (e) {
    console.warn("JWT verify failed:", e.message);
  }
  next();
};
