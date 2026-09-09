const express = require("express");
const router = express.Router();
const { coreV1Api } = require("../k8s/client");

/**
 * Liveness Probe: Verifies Express server event loop is responsive.
 */
router.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime())
  });
});

/**
 * Readiness Probe: Tests active connectivity to the in-cluster Kubernetes API server.
 * Uses listNamespacedPod on 'default' namespace with limit=1 to comply with scoped namespace RBAC.
 */
router.get("/readyz", async (req, res) => {
  try {
    await coreV1Api.listNamespacedPod({
      namespace: "default",
      limit: 1
    });

    res.status(200).json({
      status: "ready",
      k8s_connected: true,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: "unready",
      k8s_connected: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
