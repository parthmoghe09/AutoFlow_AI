"use client"

import { cn } from "@/lib/utils"
import type { AgentReading } from "@/lib/types"

export function AgentCard({ agent }: { agent: AgentReading }) {
  const pct = Math.round(agent.score * 100)
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-sm border bg-card/60 p-3 transition-all duration-500",
        agent.state === "complete" && "border-signal/40",
        agent.state === "analyzing" && "border-signal/60 shadow-[0_0_0_1px_oklch(0.78_0.15_68_/_25%)]",
        agent.state === "idle" && "border-border opacity-50",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs font-medium text-foreground">{agent.name}</span>
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[9px] uppercase tracking-widest",
            agent.state === "complete" && "bg-verified/15 text-verified",
            agent.state === "analyzing" && "bg-signal/15 text-signal",
            agent.state === "idle" && "bg-muted text-muted-foreground",
          )}
        >
          {agent.state === "complete" ? "done" : agent.state === "analyzing" ? "running" : "idle"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-signal transition-all duration-700 ease-out"
            style={{ width: agent.state !== "idle" ? `${pct}%` : "0%" }}
          />
        </div>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {agent.state !== "idle" ? `${pct}%` : "--"}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {agent.state === "idle" ? "Awaiting telemetry window\u2026" : agent.reasoning}
      </p>

      <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-muted-foreground/70">
        <span>weight {Math.round(agent.weight * 100)}%</span>
        <span>conf {Math.round(agent.confidence * 100)}%</span>
      </div>
    </div>
  )
}
