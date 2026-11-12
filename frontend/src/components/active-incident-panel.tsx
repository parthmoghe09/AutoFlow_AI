"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Incident, StageId } from "@/lib/types"

const SEVERITY_STYLE: Record<Incident["severity"], string> = {
  low: "text-muted-foreground border-border bg-muted",
  medium: "text-signal border-signal/40 bg-signal/10",
  high: "text-danger border-danger/40 bg-danger/10",
  critical: "text-danger border-danger/50 bg-danger/15",
}

export function ActiveIncidentPanel({ incident, stage }: { incident: Incident; stage: StageId }) {
  const evidenceVisible = stage !== "telemetry"
  const isPercentUnit = incident.unit === "%"
  const delta = incident.current - incident.baseline
  const deltaLabel = isPercentUnit
    ? `+${delta.toFixed(1)}pp`
    : `+${Math.round((delta / incident.baseline) * 100)}%`

  return (
    <div className="flex h-full flex-col gap-4 rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Active incident &middot; {incident.id}</span>
          <h3 className="mt-1 font-sans text-base font-semibold text-foreground">{incident.service}</h3>
          <span className="font-mono text-[11px] text-muted-foreground">{incident.namespace}</span>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-medium uppercase tracking-widest",
            SEVERITY_STYLE[incident.severity],
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          {incident.severity}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-sm border border-border bg-background/40 p-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{incident.metric.replace(/_/g, " ")}</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-danger">
            {incident.current.toLocaleString()}
            <span className="ml-1 text-xs text-muted-foreground">{incident.unit}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">baseline</div>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-muted-foreground">
            {incident.baseline.toLocaleString()}
            <span className="ml-1 text-xs text-muted-foreground">{incident.unit}</span>
          </div>
        </div>
        <div className="col-span-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-danger">{deltaLabel}</span> above baseline &middot; detected via streaming telemetry
        </div>
      </div>

      <div className={cn("flex-1 space-y-2 transition-opacity duration-500", evidenceVisible ? "opacity-100" : "opacity-30")}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Anomaly evidence</div>
        <ul className="space-y-1.5">
          {incident.evidence.map((e, i) => (
            <li
              key={i}
              className="flex gap-2 text-[11px] leading-relaxed text-foreground/90 transition-all duration-500"
              style={{
                opacity: evidenceVisible ? 1 : 0,
                transform: evidenceVisible ? "translateX(0)" : "translateX(-6px)",
                transitionDelay: `${i * 120}ms`,
              }}
            >
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-signal" />
              {e}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
