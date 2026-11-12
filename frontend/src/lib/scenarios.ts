import type { AgentId, Incident, LoopCycle, RemediationPlan, SafetyCheck } from "./types"

export const STAGES = [
  { id: "telemetry", label: "Telemetry" },
  { id: "anomaly", label: "Anomaly" },
  { id: "swarm", label: "Swarm" },
  { id: "consensus", label: "Consensus" },
  { id: "safety", label: "Safety Gate" },
  { id: "kubernetes", label: "K8s Mutation" },
  { id: "verification", label: "Verification" },
  { id: "learning", label: "Learning" },
] as const

const INCIDENT_TEMPLATES: Array<
  Omit<Incident, "id" | "timestamp"> & { evidence: string[] }
> = [
  {
    service: "checkout-api",
    namespace: "prod-payments",
    metric: "cpu_utilization",
    unit: "%",
    baseline: 42,
    current: 96,
    severity: "high",
    evidence: [
      "CPU sustained above 90% for 4m12s across 3/4 replicas",
      "p99 latency degraded from 180ms to 1,340ms",
      "No correlated deploy event in the last 30 minutes",
    ],
  },
  {
    service: "recommendation-worker",
    namespace: "prod-ml",
    metric: "memory_working_set",
    unit: "MiB",
    baseline: 512,
    current: 1948,
    severity: "critical",
    evidence: [
      "Working set growing linearly since 14:02 UTC — consistent with a leak",
      "2 OOMKilled restarts in the last 10 minutes",
      "GC pause time up 6.4x against 7-day baseline",
    ],
  },
  {
    service: "session-gateway",
    namespace: "prod-edge",
    metric: "error_rate",
    unit: "%",
    baseline: 0.4,
    current: 8.7,
    severity: "medium",
    evidence: [
      "5xx rate climbing on 2 of 6 pods, isolated to a single node pool",
      "Upstream auth-service latency unaffected — localized failure",
      "Readiness probe flapping every ~45s on affected pods",
    ],
  },
  {
    service: "ledger-reconciler",
    namespace: "prod-core",
    metric: "queue_depth",
    unit: "msgs",
    baseline: 120,
    current: 4300,
    severity: "high",
    evidence: [
      "Consumer lag growing at ~180 msgs/sec, unbounded",
      "Downstream write latency to primary store up 3.1x",
      "Autoscaler at max replica ceiling (6/6)",
    ],
  },
]

function seededRandom(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const AGENT_META: Array<{ id: AgentId; name: string }> = [
  { id: "anomaly", name: "Anomaly Agent" },
  { id: "risk", name: "Risk Agent" },
  { id: "sla", name: "SLA Agent" },
  { id: "context", name: "Context Agent" },
]

const REASONING_BANK: Record<AgentId, string[]> = {
  anomaly: [
    "Signal deviates 6.2σ from the 7-day seasonal baseline.",
    "Pattern matches 3 prior incidents resolved by scale-out.",
    "Statistical confidence high — this is not sensor noise.",
  ],
  risk: [
    "Blast radius limited to a single namespace, no shared dependency.",
    "Rollback surface is small — deployment is 2 replicas behind stable.",
    "No active change freeze or adjacent incident in this cluster.",
  ],
  sla: [
    "Error budget for this service is 61% consumed this window.",
    "Customer-facing latency SLO breached for 3 consecutive minutes.",
    "Tier-1 service — remediation priority is elevated.",
  ],
  context: [
    "No related deploy, config push, or feature flag change detected.",
    "Traffic volume is within normal range — not a load event.",
    "Historical fix for this pattern: horizontal scale, 94% success rate.",
  ],
}

function buildAgents(rand: () => number, forceQuorumFail: boolean) {
  return AGENT_META.map((meta, i) => {
    const base = forceQuorumFail
      ? i % 2 === 0
        ? 0.82
        : 0.22
      : 0.68 + rand() * 0.28
    const score = Math.min(0.98, base + rand() * 0.06)
    const confidence = 0.7 + rand() * 0.27
    const weight = [0.3, 0.25, 0.2, 0.25][i]
    return {
      id: meta.id,
      name: meta.name,
      score,
      confidence,
      weight,
      reasoning: REASONING_BANK[meta.id][i % REASONING_BANK[meta.id].length],
      state: "idle" as const,
    }
  })
}

function buildSafetyChecks(id: string): SafetyCheck[] {
  return [
    {
      id: `${id}-blast`,
      label: "Blast radius",
      detail: "Change scoped to a single deployment, no cross-service fan-out",
      status: "pending",
    },
    {
      id: `${id}-policy`,
      label: "Policy compliance",
      detail: "Action matches an approved remediation playbook",
      status: "pending",
    },
    {
      id: `${id}-budget`,
      label: "Rate budget",
      detail: "Within hourly autonomous-action budget (1 of 3 used)",
      status: "pending",
    },
    {
      id: `${id}-reversible`,
      label: "Reversibility",
      detail: "Action can be rolled back in under 30 seconds",
      status: "pending",
    },
  ]
}

export function generateCycle(cycleIndex: number): LoopCycle {
  const rand = seededRandom(cycleIndex * 7919 + 13)
  const template = INCIDENT_TEMPLATES[cycleIndex % INCIDENT_TEMPLATES.length]
  const forceQuorumFail = cycleIndex % 4 === 3

  const incident: Incident = {
    ...template,
    id: `INC-${1000 + cycleIndex}`,
    timestamp: new Date().toISOString(),
  }

  const agents = buildAgents(rand, forceQuorumFail)
  const weightedScore = agents.reduce((sum, a) => sum + a.score * a.weight, 0)
  const spread = Math.max(...agents.map((a) => a.score)) - Math.min(...agents.map((a) => a.score))

  const consensus: LoopCycle["consensus"] = forceQuorumFail
    ? "quorum-failed"
    : spread > 0.35
      ? "disagree"
      : "agree"

  const before = 2
  const after = consensus === "agree" ? before + 2 : before

  const remediation: RemediationPlan = {
    action: "Horizontal scale-out",
    resource: `deployment/${incident.service}`,
    before,
    after,
  }

  const recovered = consensus === "agree"
  const verificationSeries = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11
    if (!recovered) return incident.current - rand() * 4
    const eased = 1 - Math.pow(1 - t, 3)
    return incident.current - (incident.current - incident.baseline) * eased + (rand() - 0.5) * 3
  })

  const weightAdjustments = agents.map((a) => {
    const delta = recovered ? 0.02 + rand() * 0.02 : -(0.02 + rand() * 0.02)
    return {
      id: a.id,
      name: a.name,
      before: a.weight,
      after: Math.min(0.4, Math.max(0.1, a.weight + delta)),
    }
  })

  const outcomeLabel =
    consensus === "quorum-failed"
      ? "Quorum failed — escalated to on-call, no action taken"
      : consensus === "agree"
        ? "Remediation verified successful — model weights reinforced"
        : "Agents disagreed — conservative action taken, under observation"

  return {
    cycleIndex,
    incident,
    agents,
    consensus,
    safetyChecks: buildSafetyChecks(incident.id),
    remediation,
    recovered,
    verificationSeries,
    weightAdjustments,
    outcomeLabel,
  }
}
