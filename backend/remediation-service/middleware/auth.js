const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "autoflow_jwt_default_dev_secret_2026";

/**
 * Validates incoming Bearer JWT tokens.
 * Enforces algorithm constraint HS256 and checks token role authorization.
 */
function authenticateServiceToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: "Missing or malformed Authorization bearer token"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    req.user = decoded;

    // Verify minimum operator/admin role
    const role = decoded.role || "operator";
    if (role !== "operator" && role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Insufficient role permissions for automated remediation"
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: "Invalid or expired token",
      details: err.message
    });
  }
}

module.exports = { authenticateServiceToken };
