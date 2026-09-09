const { appsV1Api } = require("./client");

const MIN_REPLICAS = parseInt(process.env.MIN_REPLICAS || "1", 10);
const MAX_REPLICAS = parseInt(process.env.MAX_REPLICAS || "6", 10);

/**
 * Executes horizontal deployment scaling with strict boundary clamping and idempotency checks.
 *
 * @param {string} serviceName - Workload Deployment name (e.g. 'demo-app')
 * @param {string} namespace - Target Kubernetes namespace (e.g. 'default')
 * @param {Object} [options] - Scaling options (scale_factor, target_replicas)
 * @returns {Promise<Object>} Execution result metadata
 */
async function scaleDeployment(serviceName, namespace = "default", options = {}) {
  try {
    // 1. Read current deployment scale from Kubernetes API
    const scaleRes = await appsV1Api.readNamespacedDeploymentScale({
      name: serviceName,
      namespace
    });

    const currentReplicas = scaleRes.spec?.replicas ?? 1;

    // 2. Calculate target replica count
    let desiredReplicas;
    if (typeof options.target_replicas === "number" && !isNaN(options.target_replicas)) {
      desiredReplicas = options.target_replicas;
    } else {
      const factor = typeof options.scale_factor === "number" && options.scale_factor > 0 ? options.scale_factor : 2;
      desiredReplicas = currentReplicas * factor;
    }

    // 3. Apply safety boundary clamping
    const clampedReplicas = Math.min(Math.max(desiredReplicas, MIN_REPLICAS), MAX_REPLICAS);

    // 4. Idempotency check: if current replicas already equal target, avoid unnecessary cluster patch
    if (currentReplicas === clampedReplicas) {
      return {
        success: true,
        idempotent: true,
        operation: "scale_deployment",
        service_name: serviceName,
        namespace,
        previous_replicas: currentReplicas,
        desired_replicas: desiredReplicas,
        updated_replicas: clampedReplicas,
        message: `Deployment '${serviceName}' in namespace '${namespace}' is already at target scale (${clampedReplicas} replicas).`,
        executed_at: new Date().toISOString()
      };
    }

    // 5. Patch deployment scale using JSON Patch array format
    const jsonPatch = [
      {
        op: "replace",
        path: "/spec/replicas",
        value: clampedReplicas
      }
    ];

    const updatedRes = await appsV1Api.patchNamespacedDeploymentScale({
      name: serviceName,
      namespace,
      body: jsonPatch
    });

    const finalReplicas = updatedRes.spec?.replicas ?? clampedReplicas;

    return {
      success: true,
      idempotent: false,
      operation: "scale_deployment",
      service_name: serviceName,
      namespace,
      previous_replicas: currentReplicas,
      desired_replicas: desiredReplicas,
      updated_replicas: finalReplicas,
      message: `Successfully scaled deployment '${serviceName}' in namespace '${namespace}' from ${currentReplicas} to ${finalReplicas} replicas.`,
      executed_at: new Date().toISOString()
    };
  } catch (err) {
    const statusCode = err.response?.statusCode || err.statusCode || 500;
    const errorMessage = err.response?.body?.message || err.message || "Kubernetes API error during deployment scaling";

    const error = new Error(`Failed to scale deployment '${serviceName}' in '${namespace}': ${errorMessage}`);
    error.statusCode = statusCode;
    error.k8sError = err.response?.body || null;
    throw error;
  }
}

module.exports = { scaleDeployment };
