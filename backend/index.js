const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");

// Middleware
const { authenticateToken, requireRole, generateToken } = require("./middleware/auth");

// Frontend-facing routes
const incidentRoutes = require("./routes/incidentRoutes");
const metricsRoutes  = require("./routes/metricsRoutes");
const weightsRoutes  = require("./routes/weightsRoutes");
const simulateRoutes = require("./routes/simulateRoutes");

// n8n ingest routes (called by Workflows 1, 2, 4)
const eventRoutes    = require("./routes/eventRoutes");
const decisionRoutes = require("./routes/decisionRoutes");
const actionRoutes   = require("./routes/actionRoutes");

// Socket.io
const http   = require("http");
const socket = require("./socket");

const app    = express();
const server = http.createServer(app);

// Global Middleware
app.use(cors());
app.use(express.json());

// Initialize Socket.io
socket.init(server);

// Health check (Public)
app.get("/", (req, res) => {
  res.json({
    status:    "ok",
    service:   "AutoFlow Backend",
    timestamp: new Date().toISOString(),
    endpoints: {
      frontend: ["GET /incidents", "GET /metrics", "GET /weights", "GET /auth/token", "POST /simulate"],
      n8n:      ["POST /event", "POST /decision", "POST /action"]
    }
  });
});

// Issue operator token for Frontend Control Plane
app.get("/auth/token", (req, res) => {
  const token = generateToken({ sub: "autoflow-ui-control-plane", username: "operator", role: "operator" });
  res.json({ token, role: "operator" });
});

// Read-only endpoints (Public / Viewer / Operator / Admin)
app.use("/incidents", incidentRoutes);
app.use("/metrics",   metricsRoutes);
app.use("/weights",   weightsRoutes);

// Protected Ingest & Simulation endpoints (Operator, Admin)
app.use("/event",    authenticateToken, requireRole(["operator", "admin"]), eventRoutes);
app.use("/decision", authenticateToken, requireRole(["operator", "admin"]), decisionRoutes);
app.use("/simulate", authenticateToken, requireRole(["operator", "admin"]), simulateRoutes);

// Protected Action endpoint (Admin only)
app.use("/action",   authenticateToken, requireRole(["admin"]), actionRoutes);

// Start listening on 0.0.0.0 for containerized deployment
const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`AutoFlow Backend running on http://${HOST}:${PORT}`);
});
