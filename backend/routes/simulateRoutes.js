const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const path = require("path");
const socket = require("../socket");

// Manifest paths for Kubernetes fault fixtures (all self-contained under /app/manifests)
const MANIFESTS = {
  cpu: path.resolve(__dirname, "../manifests/stress-test.yaml"),
  pod: path.resolve(__dirname, "../manifests/unschedulable-pod.yaml"),
  memory: path.resolve(__dirname, "../manifests/sim-memory-pressure.yaml"),
  disk: path.resolve(__dirname, "../manifests/sim-disk-pressure.yaml"),
};

// Cleanup commands to delete the exact fault fixture applied
const CLEANUP = {
  cpu: `kubectl delete deployment cpu-stress -n stress-test --ignore-not-found`,
  pod: `kubectl delete pod impossible-pod -n default --ignore-not-found`,
  memory: `kubectl delete pod autoflow-sim-memory -n default --ignore-not-found`,
  disk: `kubectl delete pod autoflow-sim-disk -n default --ignore-not-found`,
};

// Expected Prometheus alert rule name per scenario
const ALERT_NAME = {
  cpu: "HighCPUUsage",
  memory: "NodeHighMemoryUsage",
  disk: "CriticalDiskSpace",
  pod: "PodNotScheduled",
};

// Execute kubectl command on the host/container (using in-cluster ServiceAccount permissions)
const runKubectl = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        if (stderr && stderr.includes("NotFound")) return resolve(stdout);
        return reject(new Error(stderr || err.message));
      }
      resolve(stdout);
    });
  });

const applyManifest = (manifestPath) =>
  runKubectl(`kubectl apply -f "${manifestPath}"`);

// Active simulation tracking map
const activeSimulations = new Map();

const getActiveSimulation = (service_name, namespace) => {
  for (const sim of activeSimulations.values()) {
    if (service_name && sim.service_name === service_name) return sim;
    if (namespace && sim.namespace === namespace) return sim;
  }
  const all = Array.from(activeSimulations.values());
  return all.length > 0 ? all[all.length - 1] : null;
};

const clearActiveSimulation = (simType) => {
  if (simType) activeSimulations.delete(simType);
  else activeSimulations.clear();
};

// POST /simulate — Trigger real Kubernetes ephemeral fault
router.post("/", async (req, res) => {
  const simType = req.body?.type || req.body?.scenario || "cpu";
  const io = socket.getIO();

  if (!["cpu", "memory", "disk", "pod"].includes(simType)) {
    return res.status(400).json({ success: false, message: `Unknown simulation type: ${simType}` });
  }

  if (activeSimulations.has(simType)) {
    const existing = activeSimulations.get(simType);
    if (existing && (existing.completed || (Date.now() - existing.started_at > 300000))) {
      activeSimulations.delete(simType);
    } else {
      return res.status(409).json({
        success: false,
        message: `Simulation '${simType}' is already active. Wait for resolution before re-triggering.`,
      });
    }
  }

  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const manifest = MANIFESTS[simType];
  const alertName = ALERT_NAME[simType];

  console.log(`[SIMULATE] Operator triggered: ${simType.toUpperCase()} (execution_id: ${executionId}) → applying manifest: ${manifest}`);

  try {
    const applyOutput = await applyManifest(manifest);
    console.log(`[SIMULATE] kubectl apply OK:\n${applyOutput}`);
  } catch (applyErr) {
    console.error(`[SIMULATE] kubectl apply FAILED:`, applyErr.message);
    return res.status(500).json({
      success: false,
      message: `Failed to create Kubernetes fault fixture: ${applyErr.message}`,
      execution_id: executionId
    });
  }

  const simMeta = {
    execution_id: executionId,
    simType,
    service_name: simType === "cpu" ? "cpu-stress" : (simType === "pod" ? "impossible-pod" : "demo-app"),
    namespace: simType === "cpu" ? "stress-test" : "default",
    alertName,
    started_at: Date.now()
  };
  activeSimulations.set(simType, simMeta);

  io.emit("simulation_triggered", {
    execution_id: executionId,
    status: "kubernetes_fault_injected",
    message: `Kubernetes fault applied for ${simType.toUpperCase()} — waiting for Prometheus to detect and fire alert`,
    simType,
    alertName,
    manifest: path.basename(manifest),
    started_at: simMeta.started_at,
  });

  res.json({
    success: true,
    execution_id: executionId,
    message: `Kubernetes fault fixture applied for ${simType.toUpperCase()} scenario`,
    simType,
    alertName,
    flow: "kubectl_apply → Prometheus → Alertmanager → n8n → AutoFlow pipeline",
    note: "Prometheus will fire within 20–60s. Alertmanager will POST to n8n automatically.",
  });
});

// DELETE /simulate/:type — Cleanup fault fixture on demand
router.delete("/:type", async (req, res) => {
  const simType = req.params.type;

  if (!CLEANUP[simType]) {
    return res.status(400).json({ success: false, message: `Unknown simulation type: ${simType}` });
  }

  console.log(`[SIMULATE] Cleanup requested for: ${simType.toUpperCase()}`);

  try {
    const cleanupOutput = await runKubectl(CLEANUP[simType]);
    console.log(`[SIMULATE] Cleanup OK:\n${cleanupOutput}`);
    activeSimulations.delete(simType);
    res.json({ success: true, message: `Fault fixture removed for ${simType}`, simType });
  } catch (err) {
    console.error(`[SIMULATE] Cleanup FAILED:`, err.message);
    activeSimulations.delete(simType);
    res.status(500).json({ success: false, message: err.message, simType });
  }
});

module.exports = router;
module.exports.getActiveSimulation = getActiveSimulation;
module.exports.clearActiveSimulation = clearActiveSimulation;
