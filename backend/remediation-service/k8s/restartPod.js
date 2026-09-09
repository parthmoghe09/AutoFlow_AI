const { coreV1Api } = require("./client");

/**
 * Executes a pod restart by deleting pods matching the workload label selector.
 * The Kubernetes ReplicaSet controller automatically reconciles and recreates healthy replacement pods.
 *
 * @param {string} serviceName - Workload service name (e.g. 'demo-app')
 * @param {string} namespace - Target Kubernetes namespace (e.g. 'default')
 * @returns {Promise<Object>} Execution result metadata
 */
async function restartPod(serviceName, namespace = "default") {
  const labelSelector = `app=${serviceName}`;

  try {
    // 1. List active pods matching the workload label
    const listRes = await coreV1Api.listNamespacedPod({
      namespace,
      labelSelector
    });

    const pods = listRes.items || [];
    const podNames = pods.map(p => p.metadata?.name).filter(Boolean);

    if (pods.length === 0) {
      return {
        success: true,
        idempotent: true,
        operation: "restart_pod",
        service_name: serviceName,
        namespace,
        deleted_count: 0,
        pod_names: [],
        message: `No active pods found matching label '${labelSelector}' in namespace '${namespace}'. ReplicaSet reconciliation intact.`,
        executed_at: new Date().toISOString()
      };
    }

    // 2. Delete collection of pods matching the label selector
    await coreV1Api.deleteCollectionNamespacedPod({
      namespace,
      labelSelector
    });

    return {
      success: true,
      idempotent: false,
      operation: "restart_pod",
      service_name: serviceName,
      namespace,
      deleted_count: podNames.length,
      pod_names: podNames,
      message: `Successfully triggered pod restart for '${serviceName}' in namespace '${namespace}'. Evicted ${podNames.length} pod(s).`,
      executed_at: new Date().toISOString()
    };
  } catch (err) {
    const statusCode = err.response?.statusCode || err.statusCode || 500;
    const errorMessage = err.response?.body?.message || err.message || "Kubernetes API error during pod deletion";

    const error = new Error(`Failed to restart pod for '${serviceName}' in '${namespace}': ${errorMessage}`);
    error.statusCode = statusCode;
    error.k8sError = err.response?.body || null;
    throw error;
  }
}

module.exports = { restartPod };
