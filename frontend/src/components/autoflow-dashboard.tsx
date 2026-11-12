"use client"

import { useRealTimeData } from "@/hooks/useRealTimeData"
import { SiteHeader } from "@/components/site-header"
import { PipelineNav } from "@/components/pipeline-nav"
import { ActiveIncidentPanel } from "@/components/active-incident-panel"
import { ReasoningCore } from "@/components/reasoning-core"
import { AgentCard } from "@/components/agent-card"
import { SafetyGate } from "@/components/safety-gate"
import { KubernetesPanel } from "@/components/kubernetes-panel"
import { VerificationPanel } from "@/components/verification-panel"
import { LearningPanel } from "@/components/learning-panel"

export function AutoflowDashboard() {
  const {
    stages,
    stage,
    stageStatus,
    progress,
    cycle,
    agents,
    safetyChecks,
    paused,
    setPaused,
    reducedMotion,
    triggerSimulation,
    isSimulating,
  } = useRealTimeData()

  const quorumFailed = cycle.consensus === "quorum-failed"

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader onTriggerSimulation={triggerSimulation} isSimulating={isSimulating} />
      <PipelineNav stages={stages} stageStatus={stageStatus} cycleIndex={cycle.cycleIndex} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 max-w-2xl">
          <h1 className="text-balance font-sans text-xl font-semibold text-foreground sm:text-2xl">
            Autonomous incident response, end to end
          </h1>
          <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
            A swarm of specialist agents watches production telemetry, votes on remediation by weighted consensus, clears a
            hard safety gate, mutates the cluster, and verifies the outcome — closing the loop by reinforcing what worked.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <ActiveIncidentPanel incident={cycle.incident} stage={stage} />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-2">
            <ReasoningCore agents={agents} stage={stage} consensus={cycle.consensus} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {agents.map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <SafetyGate checks={safetyChecks} stage={stage} quorumFailed={quorumFailed} />
          <KubernetesPanel plan={cycle.remediation} stage={stage} progress={progress} quorumFailed={quorumFailed} />
          <VerificationPanel
            incident={cycle.incident}
            series={cycle.verificationSeries}
            stage={stage}
            progress={progress}
            recovered={cycle.recovered}
          />
        </div>

        <div className="mt-4">
          <LearningPanel cycle={cycle} stage={stage} />
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-[11px] text-muted-foreground sm:flex-row sm:px-6">
          <span>AUTOFLOW.AI &middot; every autonomous action is gated, logged, and reversible.</span>
          <span className="font-mono">{reducedMotion ? "reduced motion" : "simulation running"}</span>
        </div>
      </footer>
    </div>
  )
}
