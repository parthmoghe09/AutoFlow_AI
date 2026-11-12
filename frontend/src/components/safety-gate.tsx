"use client"

import { Check, Lock, ShieldAlert, ShieldCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SafetyCheck, StageId } from "@/lib/types"

export function SafetyGate({
  checks,
  stage,
  quorumFailed,
}: {
  checks: SafetyCheck[]
  stage: StageId
  quorumFailed: boolean
}) {
  const started = stage === "safety" || stage === "kubernetes" || stage === "verification" || stage === "learning"
  const allPassed = checks.every((c) => c.status === "pass")
  const anyFailed = checks.some((c) => c.status === "fail")
  const gateOpen = started && allPassed && !quorumFailed
  const gateClosed = quorumFailed && stage !== "telemetry" && stage !== "anomaly" && stage !== "swarm" && stage !== "consensus"

  return (
    <div className="flex h-full flex-col gap-4 rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Authorization boundary</span>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] font-medium uppercase tracking-widest transition-colors duration-500",
            gateOpen && "border-verified/40 bg-verified/10 text-verified",
            gateClosed && "border-danger/40 bg-danger/10 text-danger",
            !gateOpen && !gateClosed && "border-border bg-muted text-muted-foreground",
          )}
        >
          {gateOpen ? <ShieldCheck className="h-3 w-3" /> : gateClosed ? <ShieldAlert className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {gateOpen ? "gate open" : gateClosed ? "gate held" : "evaluating"}
        </span>
      </div>

      <ul className="flex-1 space-y-2">
        {checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              "flex items-start gap-2.5 rounded-sm border p-2.5 transition-all duration-500",
              check.status === "pass" && "border-verified/30 bg-verified/5",
              check.status === "fail" && "border-danger/30 bg-danger/5",
              check.status === "pending" && "border-border bg-transparent",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border",
                check.status === "pass" && "border-verified bg-verified/20 text-verified",
                check.status === "fail" && "border-danger bg-danger/20 text-danger",
                check.status === "pending" && "border-border text-muted-foreground",
              )}
            >
              {check.status === "pass" && <Check className="h-2.5 w-2.5" />}
              {check.status === "fail" && <X className="h-2.5 w-2.5" />}
            </span>
            <div>
              <div className="text-xs font-medium text-foreground">{check.label}</div>
              <div className="text-[11px] leading-relaxed text-muted-foreground">{check.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        {quorumFailed
          ? "Quorum was not reached upstream — the gate holds by default and the incident escalates to on-call."
          : "Every check below must pass before any autonomous mutation reaches the cluster."}
      </p>
    </div>
  )
}
