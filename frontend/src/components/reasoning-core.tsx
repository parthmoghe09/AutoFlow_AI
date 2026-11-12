"use client"

import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import type { AgentReading, ConsensusOutcome, StageId } from "@/lib/types"

const NODE_POS = [
  { x: 70, y: 46 },
  { x: 70, y: 214 },
  { x: 410, y: 46 },
  { x: 410, y: 214 },
]
const CENTER = { x: 240, y: 130 }

function pathFor(p: { x: number; y: number }) {
  const mx = (p.x + CENTER.x) / 2
  const my = (p.y + CENTER.y) / 2 + (p.y < CENTER.y ? -18 : 18)
  return `M${p.x},${p.y} Q${mx},${my} ${CENTER.x},${CENTER.y}`
}

export function ReasoningCore({
  agents,
  stage,
  consensus,
}: {
  agents: AgentReading[]
  stage: StageId
  consensus: ConsensusOutcome
}) {
  const isConsensusStage = stage === "consensus" || stage === "safety" || stage === "kubernetes" || stage === "verification" || stage === "learning"
  const coreColor =
    !isConsensusStage
      ? "muted"
      : consensus === "agree"
        ? "verified"
        : consensus === "quorum-failed"
          ? "danger"
          : "signal"

  const coreLabel = !isConsensusStage
    ? "STANDBY"
    : consensus === "agree"
      ? "CONSENSUS"
      : consensus === "quorum-failed"
        ? "NO QUORUM"
        : "SPLIT VOTE"

  return (
    <div className="relative w-full overflow-hidden rounded-sm border border-border bg-card/40 bg-grid">
      <svg viewBox="0 0 480 260" className="h-[220px] w-full sm:h-[260px]" role="img" aria-label="Multi-agent consensus network diagram">
        {NODE_POS.map((pos, i) => {
          const agent = agents[i]
          const d = pathFor(pos)
          const active = agent?.state !== "idle"
          const strokeColor =
            agent?.state === "complete"
              ? "oklch(0.72 0.13 165)"
              : agent?.state === "analyzing"
                ? "oklch(0.78 0.15 68)"
                : "oklch(1 0 0 / 8%)"
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={strokeColor} strokeWidth={active ? 1.5 : 1} className="transition-colors duration-500" />
              {agent?.state === "analyzing" && (
                <circle r="3" fill="oklch(0.78 0.15 68)">
                  <animateMotion dur="1.4s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          )
        })}

        {NODE_POS.map((pos, i) => {
          const agent = agents[i]
          if (!agent) return null
          return (
            <g key={`node-${i}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r="20"
                className="transition-all duration-500"
                fill={agent.state === "idle" ? "oklch(0.19 0.016 245)" : "oklch(0.22 0.016 245)"}
                stroke={
                  agent.state === "complete"
                    ? "oklch(0.72 0.13 165)"
                    : agent.state === "analyzing"
                      ? "oklch(0.78 0.15 68)"
                      : "oklch(1 0 0 / 12%)"
                }
                strokeWidth="1.5"
              />
              <text
                x={pos.x}
                y={pos.y + 34}
                textAnchor="middle"
                className="select-none font-mono text-[9px] uppercase tracking-wider"
                fill={agent.state === "idle" ? "oklch(0.6 0.02 230)" : "oklch(0.93 0.008 95)"}
              >
                {agent.name.replace(" Agent", "")}
              </text>
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" className="select-none font-mono text-[10px] tabular-nums" fill="oklch(0.93 0.008 95)">
                {agent.state !== "idle" ? Math.round(agent.score * 100) : "--"}
              </text>
            </g>
          )
        })}

        <AnimatePresence mode="wait">
          <motion.g key={coreLabel} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r="34"
              fill={
                coreColor === "verified"
                  ? "oklch(0.72 0.13 165 / 15%)"
                  : coreColor === "danger"
                    ? "oklch(0.62 0.2 25 / 15%)"
                    : coreColor === "signal"
                      ? "oklch(0.78 0.15 68 / 15%)"
                      : "oklch(1 0 0 / 5%)"
              }
              stroke={
                coreColor === "verified"
                  ? "oklch(0.72 0.13 165)"
                  : coreColor === "danger"
                    ? "oklch(0.62 0.2 25)"
                    : coreColor === "signal"
                      ? "oklch(0.78 0.15 68)"
                      : "oklch(1 0 0 / 15%)"
              }
              strokeWidth="1.5"
            />
            <text
              x={CENTER.x}
              y={CENTER.y + 3}
              textAnchor="middle"
              className="select-none font-sans text-[10px] font-semibold tracking-wider"
              fill={
                coreColor === "verified"
                  ? "oklch(0.72 0.13 165)"
                  : coreColor === "danger"
                    ? "oklch(0.62 0.2 25)"
                    : coreColor === "signal"
                      ? "oklch(0.78 0.15 68)"
                      : "oklch(0.6 0.02 230)"
              }
            >
              {coreLabel}
            </text>
          </motion.g>
        </AnimatePresence>
      </svg>

      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Weighted multi-agent vote</span>
        <span
          className={cn(
            "font-medium",
            coreColor === "verified" && "text-verified",
            coreColor === "danger" && "text-danger",
            coreColor === "signal" && "text-signal",
          )}
        >
          {stage === "swarm" ? "analyzing…" : stage === "telemetry" || stage === "anomaly" ? "idle" : coreLabel.toLowerCase()}
        </span>
      </div>
    </div>
  )
}
