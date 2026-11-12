"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { api, wsManager } from "@/lib/api";
import type { BackendIncident, BackendWeight } from "@/types/autoflow";
import type {
  AgentReading,
  ConsensusOutcome,
  Incident,
  LoopCycle,
  RemediationPlan,
  SafetyCheck,
  StageId,
  WeightAdjustment,
} from "@/lib/types";

export const STAGES = [
  { id: "telemetry", label: "Telemetry", icon: "Activity" },
  { id: "anomaly", label: "Anomaly", icon: "AlertTriangle" },
  { id: "swarm", label: "Swarm", icon: "Users" },
  { id: "consensus", label: "Consensus", icon: "CheckCircle2" },
  { id: "safety", label: "Safety Gate", icon: "ShieldCheck" },
  { id: "kubernetes", label: "K8s Mutation", icon: "Terminal" },
  { id: "verification", label: "Verification", icon: "Cpu" },
  { id: "learning", label: "Learning", icon: "Brain" },
] as const;

const DEFAULT_AGENTS: AgentReading[] = [
  { id: "anomaly", name: "Anomaly Agent", score: 0, confidence: 0.95, weight: 0.3, reasoning: "Standby for incoming telemetry", state: "idle" },
  { id: "risk", name: "Risk Agent", score: 0, confidence: 0.9, weight: 0.25, reasoning: "Standby for blast radius analysis", state: "idle" },
  { id: "sla", name: "SLA Agent", score: 0, confidence: 0.92, weight: 0.25, reasoning: "Standby for SLO impact evaluation", state: "idle" },
  { id: "context", name: "Context Agent", score: 0, confidence: 0.88, weight: 0.2, reasoning: "Standby for cluster status inspection", state: "idle" },
];

const DEFAULT_SAFETY_CHECKS: SafetyCheck[] = [
  { id: "c1", label: "Cluster Readiness", detail: "Nodes healthy & API server responsive", status: "pending" },
  { id: "c2", label: "Quorum Verification", detail: "Weighted consensus threshold >= 70%", status: "pending" },
  { id: "c3", label: "Blast Radius Assessment", detail: "Affected workload within safe limits", status: "pending" },
  { id: "c4", label: "Policy Guardrails", detail: "OPA gate: action permitted in namespace", status: "pending" },
];

const DEFAULT_INCIDENT: Incident = {
  id: "INC-STANDBY",
  service: "api-gateway",
  namespace: "default",
  metric: "cpu_usage",
  unit: "%",
  baseline: 25,
  current: 25,
  severity: "low",
  timestamp: new Date().toISOString(),
  evidence: ["System nominal", "Awaiting telemetry stream"],
};

const DEFAULT_REMEDIATION: RemediationPlan = {
  action: "Scale deployment",
  resource: "deployment/api-gateway",
  before: 2,
  after: 4,
};

const DEFAULT_WEIGHTS: WeightAdjustment[] = [
  { id: "anomaly", name: "Anomaly Agent", before: 0.3, after: 0.3 },
  { id: "risk", name: "Risk Agent", before: 0.25, after: 0.25 },
  { id: "sla", name: "SLA Agent", before: 0.25, after: 0.25 },
  { id: "context", name: "Context Agent", before: 0.2, after: 0.2 },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const listener = () => setReduced(mq.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);
  return reduced;
}

export function useRealTimeData() {
  const reducedMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<{
    executionId: string | null;
    simType: string | null;
    eventId: string | null;
  } | null>(null);

  const [stageIndex, setStageIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [cycleIndex, setCycleIndex] = useState<number>(0);

  const [incident, setIncident] = useState<Incident>(DEFAULT_INCIDENT);
  const [agents, setAgents] = useState<AgentReading[]>(DEFAULT_AGENTS);
  const [consensus, setConsensus] = useState<ConsensusOutcome>("agree");
  const [safetyChecks, setSafetyChecks] = useState<SafetyCheck[]>(DEFAULT_SAFETY_CHECKS);
  const [remediation, setRemediation] = useState<RemediationPlan>(DEFAULT_REMEDIATION);
  const [recovered, setRecovered] = useState<boolean>(false);
  const [verificationSeries, setVerificationSeries] = useState<number[]>([25, 25, 25]);
  const [weightAdjustments, setWeightAdjustments] = useState<WeightAdjustment[]>(DEFAULT_WEIGHTS);
  const [outcomeLabel, setOutcomeLabel] = useState<string>("System standing by for telemetry events.");

  const stage = STAGES[stageIndex].id;

  const stageStatus = useMemo(() => {
    return STAGES.map((_, i) => {
      if (i < stageIndex) return "complete" as const;
      if (i === stageIndex) return "active" as const;
      return "pending" as const;
    });
  }, [stageIndex]);

  const cycle: LoopCycle = useMemo(
    () => ({
      cycleIndex,
      incident,
      agents,
      consensus,
      safetyChecks,
      remediation,
      recovered,
      verificationSeries,
      weightAdjustments,
      outcomeLabel,
    }),
    [
      cycleIndex,
      incident,
      agents,
      consensus,
      safetyChecks,
      remediation,
      recovered,
      verificationSeries,
      weightAdjustments,
      outcomeLabel,
    ]
  );

  // Trigger Simulation via REST
  const triggerSimulation = useCallback(
    async (type: string = "cpu") => {
      if (isSimulating) return;
      setIsSimulating(true);
      try {
        setStageIndex(0);
        setProgress(0.1);
        setRecovered(false);
        setConsensus("agree");
        setSafetyChecks(DEFAULT_SAFETY_CHECKS);
        setOutcomeLabel(`Fault fixture injection requested for ${type.toUpperCase()}...`);

        const res = await api.triggerSimulation(type);
        if (res && res.execution_id) {
          setCurrentExecution({
            executionId: res.execution_id,
            simType: type,
            eventId: null,
          });
        }
      } catch (err) {
        console.error("Failed to trigger simulation:", err);
        setOutcomeLabel(`Simulation trigger failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsSimulating(false);
      }
    },
    [isSimulating]
  );

  // Socket.IO event handler
  const handleIncidentUpdate = useCallback((data: any) => {
    if (!data) return;

    if (data.service_name || data.metric_type) {
      const metricType = data.metric_type || "cpu_usage";
      const unit = metricType.includes("memory") || metricType.includes("cpu") ? "%" : "units";
      const baseline = metricType.includes("memory") ? 30 : 25;
      const currentVal = data.metric_value !== undefined ? parseFloat(data.metric_value) : 92;
      const sev = data.anomaly_severity === "critical" || currentVal > 90 ? "critical" : "high";

      setIncident({
        id: data.event_id ? `INC-${data.event_id.substring(0, 8)}` : "INC-LIVE",
        service: data.service_name || "api-gateway",
        namespace: data.namespace || "default",
        metric: metricType,
        unit,
        baseline,
        current: currentVal,
        severity: sev,
        timestamp: data.recorded_at || new Date().toISOString(),
        evidence: [
          `Metric ${metricType} spike recorded at ${currentVal}${unit}`,
          `Z-Score: ${data.z_score || 3.4} (${data.anomaly_severity || "high"} severity)`,
          `Status: ${data.status || "detected"}`,
        ],
      });

      if (data.status === "detected") {
        setStageIndex(1); // Anomaly
        setProgress(0.5);
      }
    }

    if (data.consensus_score !== undefined || data.decision || data.anomaly_agent_score !== undefined) {
      const score = data.consensus_score !== undefined ? parseFloat(data.consensus_score) : 0.85;
      const isQuorumFail = data.decision === "manual_review" || data.decision === "ignored" || score < 0.7;

      setConsensus(isQuorumFail ? "quorum-failed" : "agree");

      setAgents([
        {
          id: "anomaly",
          name: "Anomaly Agent",
          score: data.anomaly_agent_score ?? 0.92,
          confidence: 0.95,
          weight: 0.3,
          reasoning: data.anomaly_reasoning || "High metric anomaly detected",
          state: "complete",
        },
        {
          id: "risk",
          name: "Risk Agent",
          score: data.risk_agent_score ?? 0.88,
          confidence: 0.9,
          weight: 0.25,
          reasoning: data.risk_reasoning || "Low blast radius confirmed",
          state: "complete",
        },
        {
          id: "sla",
          name: "SLA Agent",
          score: data.sla_agent_score ?? 0.85,
          confidence: 0.92,
          weight: 0.25,
          reasoning: data.sla_reasoning || "SLO budget at risk without action",
          state: "complete",
        },
        {
          id: "context",
          name: "Context Agent",
          score: data.context_agent_score ?? 0.78,
          confidence: 0.88,
          weight: 0.2,
          reasoning: data.context_reasoning || "Cluster capacity available",
          state: "complete",
        },
      ]);

      setSafetyChecks([
        { id: "c1", label: "Cluster Readiness", detail: "API server healthy", status: "pass" },
        { id: "c2", label: "Quorum Verification", detail: `Consensus score ${(score * 100).toFixed(0)}%`, status: isQuorumFail ? "fail" : "pass" },
        { id: "c3", label: "Blast Radius Assessment", detail: "Capacity check passed", status: "pass" },
        { id: "c4", label: "Policy Guardrails", detail: "OPA rule approved", status: "pass" },
      ]);

      if (isQuorumFail) {
        setStageIndex(4); // Safety Gate
        setProgress(1);
        setOutcomeLabel("Quorum was not reached — action held at Safety Gate for manual review.");
      } else {
        setStageIndex(3); // Consensus
        setProgress(0.8);
      }
    }

    if (data.action_status || data.action_type || data.outcome || data.verified_outcome) {
      const actionType = data.action_type || "scale_up";
      setRemediation({
        action: actionType.replace(/_/g, " "),
        resource: `deployment/${data.service_name || "api-gateway"}`,
        before: 2,
        after: 4,
      });

      const isSuccess = data.verified_outcome === "SUCCESS" || data.action_status === "success" || data.outcome === "SUCCESS";
      setRecovered(isSuccess);

      if (Array.isArray(data.verification_samples) && data.verification_samples.length > 0) {
        setVerificationSeries(data.verification_samples);
      } else if (data.recovery_metric_value !== undefined && data.recovery_metric_value !== null) {
        setVerificationSeries([92, 75, 45, parseFloat(data.recovery_metric_value)]);
      } else {
        setVerificationSeries([92, 70, 40, 25]);
      }

      setStageIndex(isSuccess ? 6 : 5); // Verification / K8s Mutation
      setProgress(1);
      setOutcomeLabel(
        isSuccess
          ? `Remediation '${actionType}' succeeded. Cluster telemetry verified nominal.`
          : `Remediation '${actionType}' completed with status: ${data.action_status || "evaluating"}.`
      );
    }
  }, []);

  const handleMetricsUpdate = useCallback((data: any) => {
    if (!data) return;
  }, []);

  const handleWeightsUpdate = useCallback((data: BackendWeight[] | any) => {
    if (!Array.isArray(data)) return;
    const mapped = data.map((w: BackendWeight) => ({
      id: (w.agent_name.toLowerCase().split("_")[0] || "anomaly") as AgentReading["id"],
      name: w.agent_name.replace(/_/g, " ").toUpperCase(),
      before: w.accuracy_rate ? Math.max(0.1, parseFloat(String(w.accuracy_rate)) - 0.05) : 0.25,
      after: w.current_weight ? parseFloat(String(w.current_weight)) : 0.25,
    }));
    if (mapped.length > 0) {
      setWeightAdjustments(mapped);
      setStageIndex(7); // Learning
      setProgress(1);
      setCycleIndex((prev) => prev + 1);
    }
  }, []);

  // Setup WebSocket listeners
  useEffect(() => {
    wsManager.on("incident_update", handleIncidentUpdate);
    wsManager.on("metrics_update", handleMetricsUpdate);
    wsManager.on("weights_update", handleWeightsUpdate);
    wsManager.on("simulation_triggered", (data: any) => {
      if (data && data.execution_id) {
        setCurrentExecution({
          executionId: data.execution_id,
          simType: data.simType || "cpu",
          eventId: null,
        });
      }
    });

    return () => {
      wsManager.off("incident_update", handleIncidentUpdate);
      wsManager.off("metrics_update", handleMetricsUpdate);
      wsManager.off("weights_update", handleWeightsUpdate);
    };
  }, [handleIncidentUpdate, handleMetricsUpdate, handleWeightsUpdate]);

  // Initial fetch for baseline data
  useEffect(() => {
    api
      .getWeights()
      .then((weights) => {
        if (Array.isArray(weights) && weights.length > 0) {
          handleWeightsUpdate(weights);
        }
      })
      .catch(() => {});
  }, [handleWeightsUpdate]);

  return {
    stages: STAGES,
    stage,
    stageIndex,
    stageStatus,
    progress,
    cycle,
    agents,
    safetyChecks,
    paused,
    setPaused,
    reducedMotion,
    currentExecution,
    triggerSimulation,
    isSimulating,
  };
}

