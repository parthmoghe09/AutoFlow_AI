const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "autoflow_jwt_default_dev_secret_2026";
const ALLOWED_ALGORITHMS = ["HS256"];

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing bearer token" });
  }

  jwt.verify(token, JWT_SECRET, { algorithms: ALLOWED_ALGORITHMS }, (err, user) => {
    if (err) {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient role permissions" });
    }
    next();
  };
};

const generateToken = (payload = { sub: "autoflow-ui", role: "operator" }, options = { expiresIn: "24h" }) => {
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", ...options });
};

module.exports = { authenticateToken, requireRole, generateToken, JWT_SECRET };
