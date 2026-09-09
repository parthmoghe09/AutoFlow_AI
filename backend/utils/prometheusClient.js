const http = require("http");

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || (process.env.NODE_ENV === "production" ? "http://our-prometheus.monitoring.svc.cluster.local:9090" : "http://localhost:9090");

/**
 * PromQL HTTP API Client for Prometheus telemetry queries.
 */
class PrometheusClient {
  constructor(baseUrl = PROMETHEUS_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Executes an instant PromQL query.
   * @param {string} promql - PromQL query string
   * @returns {Promise<Array<Object>>} Query result vector items
   */
  async queryInstant(promql) {
    const url = new URL("/api/v1/query", this.baseUrl);
    url.searchParams.append("query", promql);

    return new Promise((resolve, reject) => {
      const req = http.get(url.toString(), { timeout: 5000 }, res => {
        let data = "";
        res.on("data", chunk => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.status === "success") {
              resolve(parsed.data?.result || []);
            } else {
              reject(new Error(`Prometheus query failed: ${parsed.error || "Unknown error"}`));
            }
          } catch (err) {
            reject(new Error(`Failed to parse Prometheus response: ${err.message}`));
          }
        });
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Prometheus query timed out"));
      });
    });
  }

  /**
   * Checks if Prometheus server is reachable and responsive.
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const res = await this.queryInstant("up");
      return Array.isArray(res);
    } catch (err) {
      return false;
    }
  }

  /**
   * Fetches CPU utilization percentage for a given service deployment.
   * @param {string} serviceName - Target service name (e.g., 'demo-app')
   * @param {string} namespace - Target namespace (default 'default')
   * @returns {Promise<number|null>} CPU utilization percentage or null if metric unavailable
   */
  async getWorkloadCpuUtilization(serviceName = "demo-app", namespace = "default") {
    try {
      // 5-minute rate of container cpu usage seconds, averaged across pods of service
      const query = `avg(rate(container_cpu_usage_seconds_total{namespace="${namespace}", pod=~"${serviceName}-.*"}[5m])) * 100`;
      const result = await this.queryInstant(query);

      if (result && result.length > 0) {
        const val = parseFloat(result[0].value[1]);
        return isNaN(val) ? null : val;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fetches deployment ready replicas ratio (ready / desired).
   * @param {string} serviceName - Deployment name
   * @param {string} namespace - Namespace
   * @returns {Promise<number|null>} Ratio between 0.0 and 1.0
   */
  async getWorkloadReplicaReadiness(serviceName = "demo-app", namespace = "default") {
    try {
      const query = `kube_deployment_status_replicas_ready{namespace="${namespace}", deployment="${serviceName}"} / kube_deployment_spec_replicas{namespace="${namespace}", deployment="${serviceName}"}`;
      const result = await this.queryInstant(query);

      if (result && result.length > 0) {
        const val = parseFloat(result[0].value[1]);
        return isNaN(val) ? null : val;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fetches error rate (5xx status code ratio or error count).
   * @param {string} serviceName - Service name
   * @param {string} namespace - Namespace
   * @returns {Promise<number|null>} Error rate percentage (0.0 to 100.0) or null
   */
  async getWorkloadErrorRate(serviceName = "demo-app", namespace = "default") {
    try {
      const query = `sum(rate(http_requests_total{status=~"5..", namespace="${namespace}", service=~"${serviceName}.*"}[5m])) / sum(rate(http_requests_total{namespace="${namespace}", service=~"${serviceName}.*"}[5m])) * 100`;
      const result = await this.queryInstant(query);

      if (result && result.length > 0) {
        const val = parseFloat(result[0].value[1]);
        return isNaN(val) ? null : val;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fetches pod scheduling status (number of unschedulable pods).
   * @param {string} serviceName - Deployment/Service name
   * @param {string} namespace - Namespace
   * @returns {Promise<number|null>} Count of unscheduled pods or null
   */
  async getWorkloadPodSchedulingStatus(serviceName = "demo-app", namespace = "default") {
    try {
      const query = `sum(kube_pod_status_phase{namespace="${namespace}", pod=~"${serviceName}-.*", phase="Pending"})`;
      const result = await this.queryInstant(query);

      if (result && result.length > 0) {
        const val = parseFloat(result[0].value[1]);
        return isNaN(val) ? null : val;
      }
      return null;
    } catch (err) {
      return null;
    }
  }
}

module.exports = new PrometheusClient();
