import { useEffect, useState, useRef } from "react"
import { Play, Sparkles, Cpu, HardDrive, Server, AlertTriangle, ChevronDown } from "lucide-react"

interface ScenarioOption {
  id: string
  label: string
  metric: string
  icon: typeof Cpu
  badge: string
}

const SCENARIOS: ScenarioOption[] = [
  { id: "cpu", label: "HIGH CPU", metric: "api-gateway (92-98% CPU)", icon: Cpu, badge: "85% threshold" },
  { id: "memory", label: "HIGH MEMORY", metric: "payment-service (91-96% Mem)", icon: Server, badge: "90% threshold" },
  { id: "disk", label: "CRITICAL DISK", metric: "data-store (2.0-4.5% Free)", icon: HardDrive, badge: "< 5% critical" },
  { id: "pod", label: "POD NOT SCHEDULED", metric: "order-processor (Scheduling Fail)", icon: AlertTriangle, badge: "Scheduler 30s" },
]

export function SiteHeader({
  onTriggerSimulation,
  isSimulating,
}: {
  onTriggerSimulation?: (type: string) => void
  isSimulating?: boolean
}) {
  const [time, setTime] = useState<string>("")
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      )
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  // Close menu on outside click or Escape key press
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const handleSelect = (scenarioId: string) => {
    setIsOpen(false)
    if (onTriggerSimulation) {
      onTriggerSimulation(scenarioId)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-signal/40 bg-signal/10">
            <span className="h-2 w-2 rounded-full bg-signal" style={{ animation: "pulse-signal 2s ease-in-out infinite" }} />
          </div>
          <span className="font-sans text-sm font-semibold tracking-[0.18em] text-foreground">
            AUTOFLOW<span className="text-signal">.</span>AI
          </span>
          <span className="hidden rounded-sm border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
            control plane
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verified opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-verified" />
            </span>
            <span className="uppercase tracking-widest">live</span>
          </div>
          <span className="hidden font-mono text-xs text-muted-foreground tabular-nums sm:inline">{time} UTC</span>
          {onTriggerSimulation && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsOpen((prev) => !prev)}
                disabled={isSimulating}
                aria-label="Trigger simulated incident"
                aria-expanded={isOpen}
                className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-signal/50 hover:text-signal disabled:opacity-50"
              >
                {isSimulating ? <Sparkles className="h-3 w-3 animate-spin text-signal" /> : <Play className="h-3 w-3" />}
                <span className="hidden sm:inline">{isSimulating ? "Simulating..." : "Trigger Simulation"}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && !isSimulating && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-sm border border-border bg-card p-2 shadow-2xl z-50 transition-all duration-150 animate-in fade-in zoom-in-95">
                  <div className="mb-2 border-b border-border/80 pb-1.5 px-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Simulate Incident Scenario
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {SCENARIOS.map((sc) => {
                      const Icon = sc.icon
                      return (
                        <button
                          key={sc.id}
                          onClick={() => handleSelect(sc.id)}
                          className="flex items-center justify-between rounded-sm px-2.5 py-2 text-left transition-colors hover:bg-muted group border border-transparent hover:border-border"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-signal/70 group-hover:text-signal" />
                            <div>
                              <div className="font-mono text-xs font-semibold text-foreground group-hover:text-signal">
                                {sc.label}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {sc.metric}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-background">
                            {sc.badge}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
