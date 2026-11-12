"use client"

import { motion } from "motion/react"
import { Box } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RemediationPlan, StageId } from "@/lib/types"

export function KubernetesPanel({
  plan,
  stage,
  progress,
  quorumFailed,
}: {
  plan: RemediationPlan
  stage: StageId
  progress: number
  quorumFailed: boolean
}) {
  const inStage = stage === "kubernetes"
  const afterStage = stage === "verification" || stage === "learning"
  const applying = inStage && !quorumFailed

  const newPodCount = plan.after - plan.before
  const revealedNew = applying ? Math.min(newPodCount, Math.ceil(progress * newPodCount)) : afterStage && !quorumFailed ? newPodCount : 0

  const totalPods = plan.before + (quorumFailed ? 0 : newPodCount)
  const pods = Array.from({ length: totalPods }, (_, i) => {
    const isNew = i >= plan.before
    const newIndex = i - plan.before
    const visible = !isNew || newIndex < revealedNew
    return { isNew, visible }
  })

  return (
    <div className="flex h-full flex-col gap-4 rounded-sm border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Kubernetes mutation</span>
        <span
          className={cn(
            "rounded-sm border px-2 py-1 text-[10px] font-medium uppercase tracking-widest",
            quorumFailed
              ? "border-danger/40 bg-danger/10 text-danger"
              : applying
                ? "border-signal/40 bg-signal/10 text-signal"
                : afterStage
                  ? "border-verified/40 bg-verified/10 text-verified"
                  : "border-border bg-muted text-muted-foreground",
          )}
        >
          {quorumFailed ? "withheld" : applying ? "applying" : afterStage ? "applied" : "queued"}
        </span>
      </div>

      <div className="rounded-sm border border-border bg-background/40 p-3 text-[11px]">
        <div className="font-mono text-foreground">{plan.resource}</div>
        <div className="mt-1 text-muted-foreground">
          {quorumFailed ? (
            "No mutation issued — awaiting manual review"
          ) : (
            <>
              {plan.action} &middot; replicas{" "}
              <span className="font-mono text-foreground">{plan.before}</span> {"->"}{" "}
              <span className="font-mono text-verified">{plan.after}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {pods.map((pod, i) => (
          <motion.div
            key={i}
            initial={pod.isNew ? { opacity: 0, scale: 0.4 } : false}
            animate={{ opacity: pod.visible ? 1 : 0, scale: pod.visible ? 1 : 0.4 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
              "flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-sm border",
              pod.isNew ? "border-verified/40 bg-verified/10" : "border-border bg-secondary/60",
            )}
          >
            <Box className={cn("h-3.5 w-3.5", pod.isNew ? "text-verified" : "text-muted-foreground")} />
            <span className={cn("h-1 w-1 rounded-full", pod.isNew ? "bg-verified" : "bg-muted-foreground")} />
          </motion.div>
        ))}
      </div>

      <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        {quorumFailed
          ? "The cluster state remains untouched until a human operator reviews the conflicting signal."
          : "New replicas scheduled through the standard admission chain — no bypass of cluster policy."}
      </p>
    </div>
  )
}
