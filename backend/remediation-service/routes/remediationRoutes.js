const express = require("express");
const router = express.Router();
const { authenticateServiceToken } = require("../middleware/auth");
const { validateRemediationRequest } = require("../middleware/validator");
const { restartPod } = require("../k8s/restartPod");
const { scaleDeployment } = require("../k8s/scaleDeployment");

/**
 * POST /remediate
 * Single entry point for authorized Kubernetes remediation actions.
 */
router.post(
  "/remediate",
  authenticateServiceToken,
  validateRemediationRequest,
  async (req, res) => {
    const {
      event_id,
      decision_id,
      action_id,
      action_type,
      service_name,
      namespace,
      parameters,
      context
    } = req.remediation;

    const startTime = Date.now();

    try {
      let executionResult;

      if (action_type === "restart_pod") {
        executionResult = await restartPod(service_name, namespace);
      } else if (action_type === "scale_service") {
        executionResult = await scaleDeployment(service_name, namespace, parameters);
      }

      const durationMs = Date.now() - startTime;

      console.log(JSON.stringify({
        level: "info",
        timestamp: new Date().toISOString(),
        event: "remediation_executed",
        event_id,
        decision_id,
        action_id,
        action_type,
        service_name,
        namespace,
        duration_ms: durationMs,
        result: executionResult
      }));

      return res.status(200).json({
        success: true,
        action_id,
        decision_id,
        event_id,
        action_type,
        service_name,
        namespace,
        action_status: "success",
        duration_ms: durationMs,
        k8s_execution: executionResult,
        message: executionResult.message
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const statusCode = err.statusCode || 500;

      console.error(JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        event: "remediation_failed",
        event_id,
        decision_id,
        action_id,
        action_type,
        service_name,
        namespace,
        duration_ms: durationMs,
        error: err.message,
        k8s_error: err.k8sError
      }));

      return res.status(statusCode).json({
        success: false,
        action_id,
        decision_id,
        event_id,
        action_type,
        service_name,
        namespace,
        action_status: "failed",
        duration_ms: durationMs,
        error: "KUBERNETES_EXECUTION_ERROR",
        message: err.message,
        k8s_error: err.k8sError
      });
    }
  }
);

module.exports = router;
