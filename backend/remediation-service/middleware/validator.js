const ALLOWED_ACTIONS = ["restart_pod", "scale_service"];
const ALLOWED_NAMESPACES = (process.env.ALLOWED_NAMESPACES || "default,stress-test")
  .split(",")
  .map(n => n.trim().toLowerCase());

/**
 * Validates remediation request payload, action allowlist, and namespace boundaries.
 */
function validateRemediationRequest(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({
      success: false,
      error: "INVALID_PAYLOAD",
      message: "Request body must be a valid JSON object"
    });
  }

  // 1. Resolve action type
  const actionType = (body.action_type || body.remediation_action || "").toLowerCase().trim();
  if (!actionType) {
    return res.status(400).json({
      success: false,
      error: "MISSING_ACTION_TYPE",
      message: "Field 'action_type' or 'remediation_action' is required"
    });
  }

  if (!ALLOWED_ACTIONS.includes(actionType)) {
    return res.status(400).json({
      success: false,
      error: "UNSUPPORTED_ACTION",
      message: `Action '${actionType}' is not permitted. Allowed actions: ${ALLOWED_ACTIONS.join(", ")}`
    });
  }

  // 2. Resolve service name
  const serviceName = (body.service_name || "").trim();
  if (!serviceName) {
    return res.status(400).json({
      success: false,
      error: "MISSING_SERVICE_NAME",
      message: "Field 'service_name' is required"
    });
  }

  // 3. Resolve and validate namespace
  const namespace = (body.namespace || "default").toLowerCase().trim();
  if (!ALLOWED_NAMESPACES.includes(namespace)) {
    return res.status(400).json({
      success: false,
      error: "DISALLOWED_NAMESPACE",
      message: `Namespace '${namespace}' is not permitted for remediation. Allowed namespaces: ${ALLOWED_NAMESPACES.join(", ")}`
    });
  }

  // Attach normalized parameters to request
  req.remediation = {
    event_id: body.event_id || null,
    decision_id: body.decision_id || null,
    action_id: body.action_id || null,
    action_type: actionType,
    service_name: serviceName,
    namespace,
    parameters: body.parameters || {},
    context: body.context || {}
  };

  next();
}

module.exports = {
  validateRemediationRequest,
  ALLOWED_ACTIONS,
  ALLOWED_NAMESPACES
};
