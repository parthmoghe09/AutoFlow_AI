const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const healthRoutes = require("./routes/healthRoutes");
const remediationRoutes = require("./routes/remediationRoutes");

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Standard request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path !== "/healthz" && req.path !== "/readyz") {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Mount routes
app.use(healthRoutes);
app.use(remediationRoutes);

// Root informational endpoint
app.get("/", (req, res) => {
  res.json({
    service: "autoflow-remediation-service",
    version: "1.0.0",
    status: "running",
    allowed_actions: ["restart_pod", "scale_service"],
    endpoints: {
      health: "/healthz",
      readiness: "/readyz",
      remediate: "POST /remediate"
    }
  });
});

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "NOT_FOUND",
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error in remediation-service:", err);
  res.status(500).json({
    success: false,
    error: "INTERNAL_SERVER_ERROR",
    message: err.message || "An unexpected error occurred"
  });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`AutoFlow Remediation Microservice active on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down remediation service gracefully...");
  server.close(() => {
    console.log("Remediation service closed.");
    process.exit(0);
  });
});

module.exports = app;
