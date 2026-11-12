"use client"

import { Check, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { STAGES } from "@/lib/scenarios"

type Stage = (typeof STAGES)[number]

export function PipelineNav({
  stages,
  stageStatus,
  cycleIndex,
}: {
  stages: readonly Stage[]
  stageStatus: ("complete" | "active" | "pending")[]
  cycleIndex: number
}) {
  return (
    <div className="border-b border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Autonomous loop &middot; cycle {String(cycleIndex + 1).padStart(3, "0")}
          </span>
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <RotateCcw className="h-3 w-3" />
            continuous
          </span>
        </div>
        <ol className="flex items-center overflow-x-auto">
          {stages.map((s, i) => {
            const status = stageStatus[i]
            return (
              <li key={s.id} className="flex flex-shrink-0 items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] transition-colors duration-300",
                      status === "complete" && "border-verified/50 bg-verified/15 text-verified",
                      status === "active" && "border-signal bg-signal/15 text-signal",
                      status === "pending" && "border-border bg-transparent text-muted-foreground",
                    )}
                  >
                    {status === "complete" ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "whitespace-nowrap text-xs transition-colors duration-300",
                      status === "active" ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < stages.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-px w-6 flex-shrink-0 transition-colors duration-300 sm:w-10",
                      status === "complete" ? "bg-verified/50" : "bg-border",
                    )}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
