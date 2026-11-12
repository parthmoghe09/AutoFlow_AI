export type StageId =
  | "telemetry"
  | "anomaly"
  | "swarm"
  | "consensus"
  | "safety"
  | "kubernetes"
  | "verification"
  | "learning"

export interface StageDef {
  id: StageId
  label: string
}

export type AgentId = "anomaly" | "risk" | "sla" | "context"

export interface AgentReading {
  id: AgentId
  name: string
  score: number // 0-1, higher = stronger signal toward remediation
  confidence: number // 0-1
  weight: number // 0-1, influence in weighted vote
  reasoning: string
  state: "idle" | "analyzing" | "complete"
}

export type ConsensusOutcome = "agree" | "disagree" | "quorum-failed"

export interface SafetyCheck {
  id: string
  label: string
  detail: string
  status: "pending" | "pass" | "fail"
}

export interface Incident {
  id: string
  service: string
  namespace: string
  metric: string
  unit: string
  baseline: number
  current: number
  severity: "low" | "medium" | "high" | "critical"
  timestamp: string
  evidence: string[]
}

export interface RemediationPlan {
  action: string
  resource: string
  before: number
  after: number
}

export interface WeightAdjustment {
  id: AgentId
  name: string
  before: number
  after: number
}

export interface LoopCycle {
  cycleIndex: number
  incident: Incident
  agents: AgentReading[]
  consensus: ConsensusOutcome
  safetyChecks: SafetyCheck[]
  remediation: RemediationPlan
  recovered: boolean
  verificationSeries: number[]
  weightAdjustments: WeightAdjustment[]
  outcomeLabel: string
}
