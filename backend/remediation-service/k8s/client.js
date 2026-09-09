const k8s = require("@kubernetes/client-node");

const kc = new k8s.KubeConfig();

try {
  // If running inside a Kubernetes cluster, load from default cluster ServiceAccount
  kc.loadFromCluster();
  console.log("Remediation Service: Loaded in-cluster Kubernetes configuration.");
} catch (e) {
  // Fallback to local default kubeconfig for testing/dev environments
  try {
    kc.loadFromDefault();
    console.log("Remediation Service: Loaded default local kubeconfig.");
  } catch (err) {
    console.warn("Remediation Service: Warning - Could not load Kubernetes config:", err.message);
  }
}

const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);

module.exports = {
  kc,
  coreV1Api,
  appsV1Api
};
