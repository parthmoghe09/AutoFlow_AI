"use client"

import { ArrowRight, Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LoopCycle, StageId } from "@/lib/types"

export function LearningPanel({ cycle, stage }: { cycle: LoopCycle; stage: StageId }) {
  const active = stage === "learning"

  return (
    <div className="flex h-full flex-col gap-4 rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Brain className="h-3 w-3" />
          Feedback &amp; reweighting
        </span>
        <span
          className={cn(
            "rounded-sm border px-2 py-1 text-[10px] font-medium uppercase tracking-widest",
            active ? "border-signal/40 bg-signal/10 text-signal" : "border-border bg-muted text-muted-foreground",
          )}
        >
          {active ? "updating" : "idle"}
        </span>
      </div>

      <p
        className={cn(
          "rounded-sm border border-border bg-background/40 p-3 text-[11px] leading-relaxed transition-colors duration-500",
          cycle.recovered ? "text-foreground/90" : "text-foreground/80",
        )}
      >
        {cycle.outcomeLabel}
      </p>

      <ul className="flex-1 space-y-2.5">
        {cycle.weightAdjustments.map((adj) => {
          const up = adj.after >= adj.before
          return (
            <li key={adj.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-muted-foreground">{adj.name}</span>
              <span className="flex items-center gap-1.5 font-mono tabular-nums">
                <span className="text-muted-foreground">{Math.round(adj.before * 100)}%</span>
                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                <span
                  className={cn(
                    "font-medium transition-opacity duration-700",
                    up ? "text-verified" : "text-danger",
                    active ? "opacity-100" : "opacity-40",
                  )}
                >
                  {Math.round(adj.after * 100)}%
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Outcome fed back into agent weighting for cycle {cycle.cycleIndex + 2} — the loop closes and telemetry resumes.
      </p>
    </div>
  )
}
