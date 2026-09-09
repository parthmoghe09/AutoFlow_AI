const prometheusClient = require("./prometheusClient");

/**
 * Context-Aware Post-Remediation Metric Verification Engine.
 * Supports explicit outcome semantics: SUCCESS, FAILURE, INCONCLUSIVE.
 */
class PostRemediationVerifier {
  /**
   * Evaluates post-remediation recovery based on remediation action type and metric context.
   *
   * @param {string} actionType - 'scale_service', 'restart_pod', 'cleanup_disk', 'reschedule_pod', etc.
   * @param {string} serviceName - Workload service name (e.g. 'demo-app')
   * @param {string} namespace - Target namespace (default 'default')
   * @param {Object} options - Verification options including metricType and requiredStableSamples
   * @returns {Promise<Object>} Verification result: { outcome: 'SUCCESS'|'FAILURE'|'INCONCLUSIVE', recovery_metric_value, mttr_seconds, details }
   */
  async verifyRecovery(actionType = "scale_service", serviceName = "demo-app", namespace = "default", options = {}) {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 15000;
    const pollIntervalMs = options.pollIntervalMs || 2000;
    const metricType = options.metricType || (actionType === "scale_service" ? "cpu_usage" : "availability");
    const requiredStableSamples = options.requiredStableSamples || 1;
    const maxPolls = Math.max(1, Math.floor(timeoutMs / pollIntervalMs));

    let outcome = "INCONCLUSIVE";
    let recoveryMetricValue = null;
    let finalCpuVal = null;
    let finalReplicaRatio = null;
    let finalErrorRate = null;
    let isPrometheusAvailable = false;
    let observationsCount = 0;
    let consecutiveSuccessSamples = 0;
    const observedSamples = [];

    console.log(`[PostRemediationVerifier] Evaluating recovery for action '${actionType}' (metric: '${metricType}') on '${serviceName}'...`);

    // 1. Check Prometheus server availability first
    isPrometheusAvailable = await prometheusClient.checkHealth();

    if (!isPrometheusAvailable) {
      console.warn(`[PostRemediationVerifier] Prometheus server unavailable. Marking outcome INCONCLUSIVE.`);
      const durationMs = Date.now() - startTime;
      return {
        outcome: "INCONCLUSIVE",
        recovery_metric_value: null,
        mttr_seconds: Math.max(1, Math.round(durationMs / 1000)),
        details: {
          prometheus_available: false,
          observations_count: 0,
          reason: "PROMETHEUS_UNAVAILABLE"
        }
      };
    }

    // 2. Poll metrics up to maxPolls with multi-sample stability checking
    for (let poll = 0; poll < maxPolls; poll++) {
      try {
        const cpuVal = await prometheusClient.getWorkloadCpuUtilization(serviceName, namespace);
        const replicaRatio = await prometheusClient.getWorkloadReplicaReadiness(serviceName, namespace);
        const errorRateVal = await prometheusClient.getWorkloadErrorRate(serviceName, namespace);

        if (cpuVal !== null || replicaRatio !== null || errorRateVal !== null) {
          observationsCount++;
          finalCpuVal = cpuVal;
          finalReplicaRatio = replicaRatio;
          finalErrorRate = errorRateVal;
          if (cpuVal !== null) {
            observedSamples.push(Math.round(cpuVal * 10) / 10);
          }
        }

        let sampleSuccess = false;

        // Metric-specific and action-aware evaluation logic
        if (actionType === "scale_service" || metricType === "cpu_usage") {
          // For scaling / CPU incidents: 100% replica readiness and CPU not saturated (< 80%)
          if (replicaRatio !== null && replicaRatio >= 1.0 && (cpuVal === null || cpuVal < 80.0)) {
            sampleSuccess = true;
            recoveryMetricValue = cpuVal !== null ? Math.round(cpuVal * 10) / 10 : 1.0;
          }
        } else if (actionType === "restart_pod" || metricType === "error_rate") {
          // For pod restart / error rate: 100% replica readiness and no high error rates (< 5%)
          if (replicaRatio !== null && replicaRatio >= 1.0 && (errorRateVal === null || errorRateVal < 5.0)) {
            sampleSuccess = true;
            recoveryMetricValue = errorRateVal !== null ? Math.round(errorRateVal * 10) / 10 : (cpuVal !== null ? Math.round(cpuVal * 10) / 10 : 1.0);
          }
        } else if (actionType === "reschedule_pod" || metricType === "pod_scheduling") {
          // For pod scheduling: pods ready and pending count == 0
          const pendingCount = await prometheusClient.getWorkloadPodSchedulingStatus(serviceName, namespace);
          if (replicaRatio !== null && replicaRatio >= 1.0 && (pendingCount === null || pendingCount === 0)) {
            sampleSuccess = true;
            recoveryMetricValue = 0.0;
          }
        } else {
          // Generic fallback
          if ((cpuVal !== null && cpuVal < 70.0) || (replicaRatio !== null && replicaRatio >= 1.0)) {
            sampleSuccess = true;
            recoveryMetricValue = cpuVal !== null ? Math.round(cpuVal * 10) / 10 : 1.0;
          }
        }

        if (sampleSuccess) {
          consecutiveSuccessSamples++;
          if (consecutiveSuccessSamples >= requiredStableSamples) {
            outcome = "SUCCESS";
            break;
          }
        } else {
          consecutiveSuccessSamples = 0;
        }
      } catch (err) {
        console.warn(`[PostRemediationVerifier] Poll error: ${err.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // 3. Determine final outcome if not SUCCESS
    if (outcome !== "SUCCESS") {
      if (observationsCount === 0) {
        outcome = "INCONCLUSIVE"; // Missing data
      } else if (finalReplicaRatio !== null && finalReplicaRatio < 0.5) {
        outcome = "FAILURE"; // Workload unhealthy
      } else {
        outcome = "INCONCLUSIVE"; // Insufficient convergence
      }
    }

    const durationMs = Date.now() - startTime;
    const mttrSeconds = Math.max(1, Math.round(durationMs / 1000));

    console.log(`[PostRemediationVerifier] Result: outcome=${outcome}, recovery_metric=${recoveryMetricValue}, mttr=${mttrSeconds}s`);

    return {
      outcome,
      recovery_metric_value: recoveryMetricValue,
      mttr_seconds: mttrSeconds,
      observed_samples: observedSamples,
      details: {
        prometheus_available: true,
        observations_count: observationsCount,
        metric_type: metricType,
        cpu_utilization: finalCpuVal,
        replica_readiness: finalReplicaRatio,
        error_rate: finalErrorRate,
        duration_ms: durationMs
      }
    };
  }
}

module.exports = new PostRemediationVerifier();
