"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Incident, StageId } from "@/lib/types"

export function VerificationPanel({
  incident,
  series,
  stage,
  progress,
  recovered,
}: {
  incident: Incident
  series: number[]
  stage: StageId
  progress: number
  recovered: boolean
}) {
  const active = stage === "verification"
  const done = stage === "learning"
  const revealCount = active ? Math.max(2, Math.ceil(progress * series.length)) : done ? series.length : 1

  const data = series.slice(0, revealCount).map((v, i) => ({ i, value: Math.max(0, v) }))

  return (
    <div className="flex h-full flex-col gap-4 rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Post-action verification</span>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] font-medium uppercase tracking-widest",
            done && recovered && "border-verified/40 bg-verified/10 text-verified",
            done && !recovered && "border-danger/40 bg-danger/10 text-danger",
            !done && "border-border bg-muted text-muted-foreground",
          )}
        >
          {done ? (
            recovered ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> recovered
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" /> monitoring
              </>
            )
          ) : (
            <>
              <Clock className="h-3 w-3" /> watching
            </>
          )}
        </span>
      </div>

      <div className="h-32 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <ReferenceLine y={incident.baseline} stroke="oklch(0.72 0.13 165 / 60%)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke={recovered ? "oklch(0.78 0.15 68)" : "oklch(0.62 0.2 25)"}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span>
          {incident.metric.replace(/_/g, " ")} vs. baseline (<span className="text-verified">{incident.baseline}</span> {incident.unit})
        </span>
        <span className="font-mono tabular-nums text-foreground">
          {data.length ? Math.round(data[data.length - 1].value) : "--"} {incident.unit}
        </span>
      </div>
    </div>
  )
}
