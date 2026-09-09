# AutoFlow Visual Design Grammar & Autonomous Control Plane Blueprint
— Refined UI Design Specification v3.0

**Document Version**: 3.0.0 (Implementation-Ready Architectural & Interaction Specification)  
**Phase Target**: `PHASE-MIG-UI`  
**Classification**: **AUTHORITATIVE DESIGN BLUEPRINT & FRONTEND SPECIFICATION (NO IMPLEMENTATION CODE)**  
**Permitted Core Stack**: **React + TypeScript + Vite + Tailwind CSS + Kokonut UI Primitives + Motion (`motion/react` / `framer-motion`) + Lucide React**  
**Browser Branding**: **AutoFlow AI** (Favicon: React-compatible Electric Lightning Bolt `⚡`)  
**Backend Constraint**: **Strictly Frozen** (Adapts to existing Node.js REST endpoints, Socket.IO channels, PostgreSQL schema, Prometheus verifiers, and Kubernetes RBAC boundaries without backend modifications).

> [!IMPORTANT]
> **Global Specification Note on Illustrative Examples**:  
> All numeric values, IDs, timestamps, metric values, scores, MTTR values, replica counts, and payload examples shown in wireframes throughout this document are **illustrative design examples only**. They **MUST NOT** be hardcoded into the implementation or treated as backend defaults.

---

## 1. Design Philosophy & First Principles

AutoFlow is not an AI chatbot, a SaaS analytics dashboard, or a generic Kubernetes metrics viewer. AutoFlow is an **Autonomous Infrastructure Control Plane** engineered for Kubernetes SREs and platform operators overseeing automated self-healing clusters. AutoFlow is one interconnected operational control plane composed of multiple contextual views.

### Core Tenets of the Control Plane:
1. **Control-Plane First, Not Dashboard-First**: Every pixel must communicate an operational state, causal progression, safety decision, or infrastructure boundary. Zero generic KPI top cards, zero marketing hero copy, and zero decorative glassmorphism.
2. **Causal Fidelity as Primary Narrative**: The UI visually articulates the unbroken causal chain:
   $$\text{Telemetry Trigger} \longrightarrow \text{Anomaly} \longrightarrow \text{Swarm Evaluation} \longrightarrow \text{Quorum Consensus} \longrightarrow \text{Safety Gate} \longrightarrow \text{K8s Mutation} \longrightarrow \text{Prometheus Verification} \longrightarrow \text{Learning Feedback}$$
3. **Radical Data Truth**: The interface strictly reflects real backend REST responses, Socket.IO events, and Prometheus telemetry. Unexposed data is rendered as unavailable rather than fabricated.
4. **Safety as a Physical Security Boundary**: The transition from AI reasoning to live Kubernetes infrastructure mutation is represented as an explicit, high-contrast authorization gate with fail-closed defenses.

---

## 2. Core Operator Mental Model & Visual Hierarchy

The operator interface is strictly ordered by **Temporal Urgency and System Causality**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LEVEL A: GLOBAL SYSTEM HEALTH & CONNECTIVITY (Persistent Header Rail)                            │
│ "Is the control plane online, connected to minikube, and actively monitoring?"                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL B: CURRENT INCIDENT / ACTIVE CAUSAL LIFECYCLE (Primary Focus)                              │
│ "What is happening RIGHT NOW? What triggered it, and what stage is it in?"                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL C: DECISION & SAFETY BOUNDARY (Swarm + AI Safety Gate)                                     │
│ "Why did the AI swarm reach this decision, and did the safety gate authorize execution?"        │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL D: INFRASTRUCTURE MUTATION & CONVERGENCE (Kubernetes Execution)                            │
│ "What mutation was dispatched to the cluster, and are pods/replicas converging?"                 │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL E: VERIFICATION & RECOVERY PROOF (Prometheus Verifier)                                     │
│ "How do we mathematically prove the cluster actually stabilized?"                               │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL F: HISTORICAL EVIDENCE & REINFORCEMENT LEARNING (Forensic Drawer / Learning)               │
│ "What happened historically, and how did this outcome evolve future agent weights?"              │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The operator can answer **"What is happening NOW?"** in under 3 seconds before investigating **"Why did it happen?"** and **"What happened historically?"**.

---

## 3. Canonical UI Lifecycle State Machine

Every screen, badge, instrument, and transition across AutoFlow adheres to the **Canonical UI Lifecycle State Machine**:

> [!NOTE]
> **Backend Authority vs. UI-Derived State Rules**:
> - Backend-authoritative statuses and Socket.IO events (`detected`, `evaluating`, `remediating`, `resolved`, `success`, `failure`) remain the only source of truth.
> - Intermediate UI states such as `ANALYZING`, `DELIBERATING`, `CONSENSUS_REACHED`, `SAFETY_CHECK`, `AUTHORIZED`, `EXECUTING`, and `VERIFYING` may be derived client-side from existing backend payloads/events when sufficient evidence exists.
> - The frontend must **NEVER** invent, persist, `POST`, or `PATCH` new backend lifecycle states that do not exist in the frozen backend contract.
> - Do not modify backend routes, schemas, database tables, Socket.IO events, or Kubernetes contracts.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                         IDLE                           │
                  └───────────────────────────┬────────────────────────────┘
                                              │ Telemetry Surge (Z-Score > Threshold)
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                       DETECTED                         │
                  └───────────────────────────┬────────────────────────────┘
                                              │ Ingested by Swarm
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                      ANALYZING                         │
                  └───────────────────────────┬────────────────────────────┘
                                              │ 4 Personas In Flight
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                     DELIBERATING                       │
                  └───────────────────────────┬────────────────────────────┘
                                              │ Quorum Checked (>= 3 Agents)
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                  CONSENSUS_REACHED                     │
                  └───────────────────────────┬────────────────────────────┘
                                              │ Score Evaluated
                       ┌──────────────────────┴──────────────────────┐
                       │ Decision: "remediate"                       │ Decision: "alert" / "ignore"
                       ▼                                             ▼
        ┌──────────────────────────────┐              ┌──────────────────────────────┐
        │         SAFETY_CHECK         │              │          ESCALATED           │
        └──────────────┬───────────────┘              │      (Manual Review /        │
                       │ Validated                    │       Quorum Failed)         │
                       ▼                              └──────────────────────────────┘
        ┌──────────────────────────────┐
        │          AUTHORIZED          │
        └──────────────┬───────────────┘
                       │ Dispatched to K8s API Server
                       ▼
        ┌──────────────────────────────┐
        │          EXECUTING           │
        └──────────────┬───────────────┘
                       │ Action Acknowledged
                       ▼
        ┌──────────────────────────────┐
        │          VERIFYING           │ (Live 15s Prometheus Polling Window)
        └──────────────┬───────────────┘
                       │
         ┌─────────────┴────────────────────────┐
         │ Recovery Predicate Passed            │ Timeout / Threshold Failed
         ▼                                      ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│           VERIFIED           │       │            FAILED            │
│          (RECOVERED)         │       │        (INCONCLUSIVE)        │
└──────────────┬───────────────┘       └──────────────┬───────────────┘
               │                                      │
               └──────────────────┬───────────────────┘
                                  │ PostgreSQL Weight Normalization
                                  ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                        LEARNING                        │
                  └───────────────────────────┬────────────────────────────┘
                                              │ Loop Reset
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                         IDLE                           │
                  └────────────────────────────────────────────────────────┘
```

### State Metadata & Semantic Encodings

| State Name | Semantic Color | Lucide Icon | Operator Meaning | Allowed Transitions |
| :--- | :--- | :--- | :--- | :--- |
| **`IDLE`** | Neutral Slate (`#64748B`) | `Activity` | Nominal operations; baseline telemetry | $\rightarrow$ `DETECTED` |
| **`DETECTED`** | Ambient Amber (`#F59E0B`) | `AlertCircle` | Threshold or Z-score violation ingested | $\rightarrow$ `ANALYZING`, `FAILED` |
| **`ANALYZING`** | Kinetic Indigo (`#6366F1`) | `BrainCircuit` | Telemetry payload distributed to personas | $\rightarrow$ `DELIBERATING` |
| **`DELIBERATING`**| Kinetic Indigo (`#6366F1`) | `Cpu` | 4 personas calculating $s_i$ and rationale | $\rightarrow$ `CONSENSUS_REACHED`, `ESCALATED` |
| **`CONSENSUS_REACHED`** | Spectral Blue (`#3B82F6`) | `GitMerge` | Authoritative $C = \sum w_i s_i / \sum w_i$ computed | $\rightarrow$ `SAFETY_CHECK`, `ESCALATED` |
| **`SAFETY_CHECK`**| Warning Amber (`#D97706`) | `ShieldAlert` | Evaluating quorum, NaN, and RBAC token | $\rightarrow$ `AUTHORIZED`, `ESCALATED` |
| **`AUTHORIZED`** | Laser Cyan (`#06B6D4`) | `ShieldCheck` | Security gate cleared; mutation permit signed | $\rightarrow$ `EXECUTING` |
| **`EXECUTING`** | Mutation Orange (`#F97316`)| `Terminal` | Kubernetes API mutating pod/deployment | $\rightarrow$ `VERIFYING`, `FAILED` |
| **`VERIFYING`** | Pulsing Amber (`#F59E0B`) | `Clock` | Live Prometheus 15s verification window | $\rightarrow$ `VERIFIED`, `FAILED` |
| **`VERIFIED`** | Solid Emerald (`#10B981`) | `CheckCircle2`| Prometheus recovery verified ($<80\%$ CPU) | $\rightarrow$ `LEARNING` |
| **`LEARNING`** | Laser Cyan (`#06B6D4`) | `TrendingUp` | PostgreSQL weights updated ($\sum w_i = 1.0$) | $\rightarrow$ `IDLE` |
| **`FAILED`** | Critical Crimson (`#EF4444`)| `XCircle` | Mutation failed or verification timed out | $\rightarrow$ `LEARNING`, `IDLE` |
| **`ESCALATED`** | Fail-Closed Red (`#DC2626`) | `AlertOctagon`| Quorum collapse ($<3$ valid) $\rightarrow$ Manual review | $\rightarrow$ `IDLE` |
| **`UNKNOWN`** | Muted Grey (`#475569`) | `HelpCircle` | Data missing, corrupted, or unreachable | $\rightarrow$ `IDLE`, `DETECTED` |

---

## 4. Refined Visual Identity & Design System Tokens

AutoFlow uses an **Industrial Carbon & Calibrated Spectral State** design grammar.

```
[Substrate Level 0 - Deepest Void]  #08090C  ──  Backdrop for high-contrast telemetry
[Substrate Level 1 - Instrument Base] #0E1117  ──  Structural operating planes
[Substrate Level 2 - Surface Canvas]   #161B24  ──  Focus areas and forensic drawers
[Substrate Level 3 - Interactive Card] #1E2430  ──  Selectable incident rows and controls
[Border Precision - 1px Structural]  #232A36  ──  Wireframe boundaries (No fuzzy glows)
[Border Highlight - Focus Active]    #3B82F6  ──  Keyboard and selection focus
```

### 4.1 Resolution of Semantic Color Collisions

To prevent operator confusion between similar colors:
1. **`ANOMALY` vs `SIMULATION` vs `EXECUTION`**:
   - **`ANOMALY`**: Solid Radiant Amber (`#F59E0B`) on dark carbon.
   - **`SIMULATION`**: **45-Degree Amber/Black Warning Stripes** (`repeating-linear-gradient(45deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.2) 10px, transparent 10px, transparent 20px)`) + explicit `[TEST / SYNTHETIC]` pill.
   - **`EXECUTION`**: High-Luminance Mutation Orange (`#F97316`) paired with `Terminal` icon.
2. **`LEARNING` vs `GENERIC AI`**:
   - Cyan (`#06B6D4`) is reserved exclusively for **Verified Learning Deltas ($\Delta w_i$)** and **Security Authorization Permits**. It is never used as generic decorative "AI glow".
3. **`SAFETY/ERROR` vs `CRITICAL ANOMALY`**:
   - **`CRITICAL ANOMALY`**: Radiant Amber (`#F59E0B`).
   - **`SAFETY GATE FAIL-CLOSED / ERROR`**: Pure High-Contrast Crimson (`#EF4444`).

### 4.2 Typography & Numerical Clarity
- **UI Architecture**: `Inter`, `-apple-system`, `sans-serif` (tight `-0.015em` letter-spacing).
- **Telemetry & Monospace**: `JetBrains Mono`, `ui-monospace` with CSS `font-variant-numeric: tabular-nums` to guarantee zero text jitter during live streaming updates.

---

## 5. Global Navigation & Information Architecture

AutoFlow is one interconnected operational control plane composed of multiple contextual views. The 8 routes are organized into **3 Clear Functional Tiers**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       GLOBAL NAVIGATION MODEL                                    │
│                                                                                                  │
│  [PRIMARY OPERATIONAL SURFACES]                                                                  │
│  ├── /            Command Center (Active Incident Spotlight + Live Closed-Loop Monitor)          │
│  └── /incidents   Forensic Incident Matrix (Full lifecycle history, PromQL queries, raw logs)    │
│                                                                                                  │
│  [SECONDARY SUBSYSTEM VIEWS]                                                                     │
│  ├── /swarm       Multi-Agent Arena (4 LLM personas, individual weights, confidence breakdown)   │
│  ├── /remediation Kubernetes Execution Gate (RBAC validation, mutation status, verifier history) │
│  └── /kubernetes  Cluster Workload Topology (demo-app, cpu-stress, pod replica convergence)     │
│                                                                                                  │
│  [SUPPORTING GOVERNANCE & TELEMETRY SURFACES]                                                    │
│  ├── /telemetry   Prometheus Scrape Stream (PromQL vectors, threshold violation analysis)        │
│  ├── /learning    Adaptive Weight Evolution (ACID weight deltas, prediction accuracy curves)     │
│  └── /security    Guardrails & RBAC Governance (JWT, Ingress TLS, AI quorum safety boundaries)   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Context-Sensitive Autonomous Loop Navigation
The Causal Loop is not a static topbar copy-pasted across pages. It renders in two distinct modes:

1. **Global Header Loop Machine (Compact)**:
   - Displays real-time aggregate state: `INGESTION ●` $\rightarrow$ `SWARM ●` $\rightarrow$ `SAFETY ●` $\rightarrow$ `K8S ●` $\rightarrow$ `VERIFIER ●`.
   - Hovering shows live subsystem health and latency.
2. **Active Incident Progression Ribbon (Incident-Specific)**:
   - Appears in the Command Center and Forensic Drawer.
   - Shows the exact step-by-step progress of the selected incident:
     $$\text{Telemetry (14:42:01)} \longrightarrow \text{Swarm (14:42:02)} \longrightarrow \text{Consensus (0.898)} \longrightarrow \text{Safety (Passed)} \longrightarrow \text{K8s (Scaled)} \longrightarrow \text{Verify (14.2s)} \longrightarrow \text{Learn (+0.018)}$$

---

## 6. Command Center Architecture (`/`)

The Command Center is designed entirely around the **Active Incident Causal Stream**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ AutoFlow AI │ Cluster: minikube (v1.38.1) │ Ingress: TLS 1.3 Active │ Socket.IO: ● LIVE │ 14:42:18 UTC       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ACTIVE INCIDENT: #evt_001 │ Target: default/demo-app │ Trigger: CPU 95.4% (Z-Score: +3.8σ) │ Severity: CRITICAL  │
│ [STAGE PROGRESSION: Telemetry ► Anomaly ► Swarm ► Consensus ► Safety ► Remediation ► VERIFYING (11s/15s) ► Learn] │
├────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┤
│                                                        │                                                        │
│             1. ANOMALY & TELEMETRY EVIDENCE            │            2. SWARM CONSENSUS & WEIGHT MATRIX          │
│                                                        │                                                        │
│ Target Workload:  default / payment-service            │ Quorum Status: 4/4 Valid Responses (PASSED)            │
│ Trigger Metric:   container_cpu_usage                  │                                                        │
│ Observed Value:   95.4% (Threshold: 80.0%)             │ • Anomaly Sentinel:   0.8500  [Weight: 0.3000]         │
│ Baseline Z-Score: +3.8σ above 1h mean (45.0%)          │ • Risk Assessor:      0.8800  [Weight: 0.3500]         │
│ Anomaly Duration: 48 seconds                           │ • SLA Guardian:       0.7600  [Weight: 0.2500]         │
│                                                        │ • Context Historian:  0.6500  [Weight: 0.1000]         │
│ [Inspect Raw Telemetry Payload]                        │                                                        │
│                                                        │ WEIGHTED CONSENSUS SCORE: 0.8200 ──► [REMEDIATE]       │
├────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┤
│                                                                                                                 │
│                      3. AI SAFETY GATE & KUBERNETES MUTATION PIPELINE                                           │
│                                                                                                                 │
│  [AI SAFETY GATE: PASSED] │ [Quorum: 4/4] │ [NaN Defense: OK] │ [RBAC ServiceAccount: remediation-sa]           │
│  Action: scale_service ──► Target: default/demo-app (Replicas: 2 -> 4) ──► Status: EXECUTING (Acknowledged)    │
│  Pod Convergence: [demo-app-1: Running] [demo-app-2: Running] [demo-app-3: Starting] [demo-app-4: Starting]   │
│                                                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                 │
│                      4. PROMETHEUS RECOVERY VERIFIER (Live 15s Polling Window)                                  │
│                                                                                                                 │
│  Live Metric Trajectory: [ 95.4% ──► 88.1% ──► 62.4% ──► 42.1% ]  (Target Predicate: CPU < 80.0%)              │
│  Polling Progress: [████████████████████░░░░░░░░░░] 11s / 15s elapsed  │ Current Sample: 42.1% (STABLE)        │
│                                                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [SYNTHETIC SIMULATION DOCK: Trigger CPU Surge | Pod Crash | Memory Leak] ──── [Live Event: 14:42:04 Action Ack] │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Nominal Operations State (When No Active Incident Exists)
When the cluster is completely healthy, the Command Center does NOT display fake alerts or static placeholders. It smoothly transitions into **Nominal Cluster Orbit Mode**:
- Renders the cluster topology overview (namespaces, running deployments, active pod count).
- Displays live telemetry heartbeat sparklines for `demo-app` and cluster nodes.
- Shows the last verified remediation MTTR, current agent weight balance, and a clear **"SYSTEM NOMINAL — MONITORING CLUSTER"** status pill.

---

## 7. Swarm Visualization: Readability-First Consensus Model

We reject overly abstract polar/radar geometries in favor of a **Dual-Tier Mathematical Convergence Instrument**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               SWARM CONSENSUS CONVERGENCE INSTRUMENT                             │
│   Quorum Contract: >= 3 Valid Agent Scores [0.0 - 1.0]  │  Weight Normalization: Sum(w_i) = 1.0  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [AGENT 1: ANOMALY SENTINEL]   Score: 0.8500  Weight: 0.3000  (Contribution: 0.2550)            │
│   Rationale: "PromQL CPU is +3.8 sigma above baseline. Critical anomaly detected."              │
│   [████████████████████████████████████████████░░░░░░░░░░] Confidence: HIGH                     │
│                                                                                                  │
│   [AGENT 2: RISK ASSESSOR]      Score: 0.8800  Weight: 0.3500  (Contribution: 0.3080)            │
│   Rationale: "Payment service is a tier-1 critical dependency. Failure cascades to checkout."    │
│   [██──────────────────────────────────────────░░░░░░░░░░] Confidence: HIGH                     │
│                                                                                                  │
│   [AGENT 3: SLA GUARDIAN]       Score: 0.7600  Weight: 0.2500  (Contribution: 0.1900)            │
│   Rationale: "SLA breach projected in 4 minutes without intervention."                          │
│   [████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░] Confidence: MEDIUM                   │
│                                                                                                  │
│   [AGENT 4: CONTEXT HISTORIAN]  Score: 0.6500  Weight: 0.1000  (Contribution: 0.0650)            │
│   Rationale: "No scheduled maintenance windows match this timestamp. Genuine anomaly."           │
│   [█████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] Confidence: MEDIUM                   │
│                                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│   CONVERGENCE FORMULA: C = (0.2550 + 0.3080 + 0.1900 + 0.0650) / 1.0000 = 0.8180                 │
│                                                                                                  │
│   CONVERGENCE METER:                                                                             │
│   0.00 ───────────── [Ignore] ───────────── 0.50 ───────────── [Remediate: 0.8180] ──────► 1.00 │
│   [STATUS: QUORUM REACHED (4/4) ── DECISION: REMEDIATE_INFRASTRUCTURE]                           │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Adversarial Defense & Quorum Collapse
- If an agent produces `NaN`, `null`, non-numeric garbage, or times out, its bar turns **Crimson** with label `[EXCLUDED: INVALID SCORE]`.
- The server recalculates normalized weights over the remaining valid agents:
  $$w'_i = \frac{w_i}{\sum_{k \in \text{valid}} w_k}$$
- If fewer than 3 valid agents remain ($N_{\text{valid}} < 3$), the instrument locks down with a high-contrast **QUORUM COLLAPSE: FAIL-CLOSED** banner and routes the incident to `ESCALATED` (Manual Review).

---

## 8. Safety Gate: Physical Security Boundary

The AI Safety Gate is the visual and architectural demarcation between **AI Advisory Reasoning** and **Authorized Infrastructure Mutation**:

> [!CAUTION]
> **Security & Secret Non-Disclosure Rule**:
> - The UI may display authorization metadata, ServiceAccount name, namespace scope, allowed verbs, validation result, and policy status.
> - The UI must **NEVER** render, expose, copy, persist, or log actual bearer tokens, JWT secrets, Kubernetes ServiceAccount tokens, credentials, or other secrets.
> - A token/credential existing in a backend response does **NOT** make it valid UI data.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  AI SAFETY & AUTHORIZATION GATE                                  │
│                 [BOUNDARY: AI ADVISORY QUORUM ──► KUBERNETES MUTATION PERMIT]                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   GUARDRAIL 1: QUORUM VALIDATION         GUARDRAIL 2: NUMERICAL SANITIZATION                     │
│   • Valid Agents: 4 / 4                  • Score Domain: [0.0, 1.0] Strictly Verified            │
│   • Minimum Required: 3                  • NaN / Infinity Defense: PASSED                        │
│   • Status: PASSED (Quorum Met)          • Status: PASSED (Zero Anomalies)                       │
│                                                                                                  │
│   GUARDRAIL 3: ACTION ALLOWLIST          GUARDRAIL 4: RBAC & SERVICEACCOUNT                      │
│   • Proposed: scale_service              • ServiceAccount: remediation-sa                        │
│   • Allowed: [scale, restart, clean]     • Namespace Scope: default (Target Allowed)             │
│   • Node Drain Action: FORBIDDEN         • Policy Enforcement: PERMITTED                         │
│                                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│   AUTHORIZATION SEAL: #AUTH-20260902-8842 │ ISSUED AT: 14:42:03 UTC                              │
│   STATUS: MUTATION AUTHORIZED ── EXECUTING ON MINIKUBE CLUSTER API SERVER                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Remediation State Machine & Verification Engine

Remediation is not an instantaneous flag; it is a **Multi-Stage Physical Cluster Workflow**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  REMEDIATION EXECUTION & PROOF                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [1. PROPOSED] ──► [2. AUTHORIZED] ──► [3. EXECUTING] ──► [4. POD CONVERGENCE] ──► [5. VERIFYING] │
│      Done              Done                 Done                Converged              In Flight │
│                                                                                                  │
│  Target Workload:     default / payment-service                                                  │
│  Mutation Dispatched: Patch Deployment Spec (replicas: 2 -> 4)                                   │
│  API Response:        HTTP 200 OK (84ms latency)                                                 │
│                                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                   PROMETHEUS RECOVERY VERIFIER                                   │
│                                                                                                  │
│  Verification Predicate: container_cpu_usage < 80.0% AND replica_ready == 1.0                    │
│  Window Duration:        15 seconds (2-second polling intervals)                                 │
│                                                                                                  │
│   100% ┼                                                                                         │
│    80% ┼ - - - - - - - - - - - - - - - - - - - - - - - - - [CRITICAL THRESHOLD: 80.0%]           │
│    60% ┼                \                                                                        │
│    40% ┼                 \───────────● [Current: 42.1% - RECOVERY CONFIRMED]                     │
│    20% ┼                                                                                         │
│     0% ┴─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────►                   │
│                 T+0       T+2s      T+4s      T+6s      T+8s      T+10s (Verified)               │
│                                                                                                  │
│  VERIFICATION VERDICT: VERIFIED_RECOVERY (MTTR: 8.0s, Prometheus Scrapes: 4/4 Stable)           │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Global Forensic Drawer Architecture

Clicking any incident, agent score, or verification step opens the **Deep Forensic Drawer** (Width: `640px` on desktop, full-screen on mobile):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ FORENSIC INSPECTION: Incident #evt_mock_001                     [✕ Close]    │
│ Target: default/payment-service │ Status: VERIFIED │ Recorded: 14:42:01 UTC     │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [TAB 1: TELEMETRY]  [TAB 2: SWARM REASONING]  [TAB 3: REMEDIATION]  [TAB 4: DB] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ PromQL Scrape Query:                                              [📋 Copy]     │
│ sum(rate(container_cpu_usage_seconds_total{pod=~"payment-.*"}[1m])) by (pod)    │
│                                                                                 │
│ Raw Telemetry Payload (JSON):                                     [📋 Copy]     │
│ {                                                                               │
│   "event_id": "evt_mock_001",                                                   │
│   "service_name": "payment-service",                                            │
│   "namespace": "production",                                                    │
│   "metric_type": "cpu_usage",                                                   │
│   "metric_value": 95.4,                                                         │
│   "z_score": 3.8,                                                               │
│   "anomaly_severity": "critical",                                               │
│   "status": "resolved"                                                          │
│ }                                                                               │
│                                                                                 │
│ Groq LLM Prompt & Persona Rationales:                                           │
│ • Anomaly Sentinel: "CPU usage is 3.8 SD above baseline (45%)."                 │
│ • Risk Assessor: "Payment service is a tier-1 critical dependency."             │
│                                                                                 │
│ PostgreSQL Learning Ledger Audit:                                               │
│ Transaction ID: #TXN-902-881 │ Weight Delta: Anomaly Sentinel (+0.0180)         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Strict Data Truth & Frozen Backend Binding Matrix

The UI binds exclusively to the frozen backend routes and event channels. **Zero data fabrication is permitted.**

> [!IMPORTANT]
> **Data-Truth Implementation Rule**:  
> Every dynamic displayed value must have a traceable source: frozen REST response, frozen Socket.IO event, Prometheus/Kubernetes/PostgreSQL data exposed through those contracts, or explicitly declared static configuration. If the required source is unavailable or null, render **`UNKNOWN / UNAVAILABLE`** rather than zero, placeholder, estimated, or fabricated data.

### 11.1 Backend Route Binding Matrix

| UI Surface / Requirement | Frozen Backend Contract | Protocol / Format | Fallback Behavior if Unavailable |
| :--- | :--- | :--- | :--- |
| **Active & Historical Incidents** | `GET /incidents` | HTTP REST JSON Array | Show `No active cluster incidents` |
| **Real-Time Lifecycle Updates** | `incident_update` | Socket.IO Event | Fall back to REST polling every 5s |
| **Cluster Metrics & MTTR KPIs** | `GET /metrics`, `metrics_update` | REST / Socket.IO | Show `Telemetry stream unreachable` |
| **Agent Weights & Accuracies** | `GET /weights`, `weights_update` | REST / Socket.IO | Render `UNKNOWN / UNAVAILABLE` (Unless `STATIC CONFIG` baseline is explicitly declared) |
| **Synthetic Stress Trigger** | `POST /simulate` | HTTP REST (`operator`/`admin`) | Disable control if operator unauthenticated |
| **Admin Remediation Action** | `POST /action` | HTTP REST (`admin` only) | Show `RBAC: Insufficient Permissions` |

### 11.2 Explicit Data Classification Labels
Every data element in the UI must belong to one of four strict classifications:
1. **`LIVE`**: Verified data actively scraping from Prometheus, Kubernetes, or PostgreSQL.
2. **`SIMULATION`**: Injected via `/simulate`, visually wrapped in amber warning stripes.
3. **`STATIC CONFIG`**: Known architecture baselines (RBAC roles, TLS 1.3 parameters, Quorum $\ge 3$, or explicitly declared baseline weights).
4. **`UNKNOWN / UNAVAILABLE`**: Displayed when backend data is `null` or unreachable. Never invent mock numbers.

---

## 12. Implementation Truth Contract

To maintain total fidelity to the frozen backend and eliminate runtime speculation, every UI element must strictly adhere to this five-tier contract:

1. **A. BACKEND-AUTHORITATIVE**:
   - Existing REST responses (`GET /incidents`, `GET /metrics`, `GET /weights`) and Socket.IO events (`incident_update`, `metrics_update`, `weights_update`, `simulation_triggered`).
2. **B. UI-DERIVED**:
   - Values or visual state representations calculated client-side from available backend data (e.g., stage progression indicator, contribution $w_i s_i$, consensus convergence score), without modifying backend state or inventing endpoints.
3. **C. STATIC CONFIG**:
   - Explicit architectural constants such as quorum rules ($\ge 3$), known ServiceAccount names (`remediation-sa`), TLS parameters, or genuinely configured baseline defaults.
4. **D. UNKNOWN / UNAVAILABLE**:
   - Explicit fallback rendered whenever required live data cannot be obtained from the backend or WebSocket stream.
5. **E. ILLUSTRATIVE BLUEPRINT VALUES**:
   - Values and timestamps shown in documentation wireframes for specification purposes only; never hardcoded into component code.

*Security Invariant*: Secrets, passwords, JWT signatures, and Kubernetes ServiceAccount bearer tokens are **NEVER UI-rendered, logged, or copied**.

---

## 13. Component Framework & Kokonut UI Flexibility

> [!TIP]
> **Kokonut Implementation Rule**:  
> Use Kokonut UI primitives where an appropriate existing primitive is available. Otherwise compose the required instrument using the already permitted **React + TypeScript + Tailwind + Motion + Lucide** stack. Do **NOT** introduce another UI framework or dependency solely to reproduce a named Kokonut primitive.

---

## 14. Empty, Error, and Disconnected States

| Failure Scenario | UI Visual Representation | Operator Action / Fallback |
| :--- | :--- | :--- |
| **No Active Incidents** | **Nominal Cluster Orbit Mode**: Calm slate topology with live heartbeat sparklines. | Monitoring actively. SRE can launch synthetic simulation. |
| **Socket.IO Disconnected** | Amber top banner: `[DISCONNECTED — ATTEMPTING RECONNECT (POLLING REST)]`. | Auto-falls back to 5s HTTP polling without crashing UI. |
| **Backend API Down (500/503)** | High-contrast crimson card: `[BACKEND API UNREACHABLE — RETRYING]`. | Displays last cached cluster state with explicit timestamp. |
| **Prometheus Unavailable** | Status badge: `VERIFICATION INCONCLUSIVE (PROMETHEUS UNREACHABLE)`. | Flags incident for manual verification; avoids false success. |
| **Quorum Collapse ($<3$ valid)** | Red fail-closed banner: `[QUORUM COLLAPSE: MANUAL REVIEW REQUIRED]`. | Remediation mutation blocked; fail-closed safety gate triggers. |

---

## 15. High-Value Motion Design Language

Animations are strictly categorized to eliminate visual noise during incidents:

> [!NOTE]
> **Motion Priority Rule**:
> - **Critical** causal and state transitions are mandatory.
> - **Useful** transitions should be implemented where they improve operational comprehension.
> - **Decorative** motion must not be introduced.
> - Reduced-motion behavior remains mandatory.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      AUTOFLOW MOTION CATEGORIES                                  │
│                                                                                                  │
│  [CATEGORY 1: CRITICAL (State Transitions & Causal Progression)]                                 │
│  • Stage Advance: Linear progress trace between nodes (duration: 0.35s, ease: [0.16, 1, 0.3, 1]) │
│  • State Morphing: Status badge morphs Cyan -> Amber -> Emerald via Motion layoutId              │
│  • Safety Gate Drop: High-contrast shutter entrance on fail-closed trigger                       │
│                                                                                                  │
│  [CATEGORY 2: USEFUL (Metric Convergence & Pod Scaling)]                                         │
│  • Pod Replica Expansion: Staggered spring entrance (stiffness: 300, damping: 25, stagger: 0.08)  │
│  • Weight Vector Glide: Synchronized horizontal bar transitions on DB update                    │
│  • Tabular Number Roll: Smooth counter interpolation on verified MTTR and recovery metrics       │
│                                                                                                  │
│  [CATEGORY 3: OPTIONAL (Subtle Micro-Interactions)]                                              │
│  • Button Hover / Focus: Instant 1px border highlight (0.1s easeOut)                             │
│  • Drawer Slide: Spring physics slide-over (stiffness: 350, damping: 30)                         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

*Reduced Motion*: Strictly obeys `@media (prefers-reduced-motion: reduce)`. All spring and spatial translations convert to instant opacity dissolves (`0.15s`).

---

## 16. Responsive Behavior & Density Adaptability

- **Ultrawide (> 1600px)**: 3-column expanded control plane (Persistent loop rail, active incident HUD, swarm convergence instrument, and Prometheus verifier simultaneously visible).
- **Standard Desktop (1024px – 1599px)**: 2-column balanced workspace (Active incident focus 65%, Swarm/Safety context 35%).
- **Tablet (768px – 1023px)**: Single-column vertically stacked view with sticky bottom action controls.
- **Mobile (< 768px)**: Streamlined incident stream with full-screen slide-over forensic drawers.

---

## 17. Accessibility & Operational Ergonomics (WCAG 2.1 AA)

1. **Keyboard-First Shortcuts**:
   - `J` / `K` or `Down` / `Up`: Navigate active incidents.
   - `Enter` / `Space`: Open deep forensic drawer.
   - `Escape`: Close drawer / dismiss dialog.
   - `1` to `8`: Direct surface switching (`/` through `/security`).
2. **ARIA & Screen Readers**:
   - Live Socket.IO notifications pipe into an `aria-live="polite"` live region.
   - Every status badge includes full descriptive text (`aria-label="Severity Critical: CPU at 95.4 percent"`).
3. **Non-Color Indicators**:
   - State is never conveyed by color alone. Every badge pairs color with an explicit Lucide icon and text label.
4. **Focus Rings**: High-contrast, 2px solid cyan focus ring (`outline: 2px solid #38BDF8; outline-offset: 2px`).

---

## 18. Implementation Acceptance Criteria (Quality Gate)

Before the upcoming frontend implementation is approved, it must satisfy all 10 Quality Gates:

1. **Control Plane Identity**: Zero generic four-card KPI top-bars, zero purple gradients, zero marketing tropes.
2. **Causal Loop Centrality**: The 9-stage causal loop is visibly traceable on every screen.
3. **Swarm Convergence**: Agent evaluations are rendered as an intuitive mathematical convergence model.
4. **Safety Gate Transparency**: Safety boundary and ServiceAccount RBAC permissions are explicitly displayed.
5. **Evidence-Based Remediation**: Remediation shows live pod convergence and Prometheus 15s verification curves.
6. **Adaptive Learning**: Weight adjustments display floating $\Delta w_i$ badges and PostgreSQL transaction logs.
7. **Strict Data Truth**: 100% of rendered values bind to live REST/Socket.IO backend contracts or explicit static configuration. Zero mock numbers.
8. **Simulation Separation**: Synthetic tests are unmistakably segregated with 45-degree amber hazard borders.
9. **Browser Branding**: Window title is strictly **AutoFlow AI** with a React lightning bolt favicon (`⚡`).
10. **Frozen Backend Compliance**: Zero modifications to backend routes, database schema, or Kubernetes manifests.

---

## 19. Contradictions Resolved from Previous Blueprint

| Contradiction in Rejected Blueprint | Resolution in v3.0 Blueprint |
| :--- | :--- |
| **8 Disconnected Pages vs "One Surface"** | Structured into 3 clear functional tiers (Primary Operations, Subsystem Deep Dives, Governance) with cross-navigable incident context. |
| **Polar Radar vs Operational Readability** | Replaced abstract radar crosshair with a dual-tier mathematical convergence instrument prioritizing score, weight, and contribution clarity. |
| **Simulation as Both State and Route** | Defined simulation as a segregated, amber-striped test dock and visual state wrapper across existing surfaces. |
| **Color Ambiguity (Cyan for AI & Learning)** | Reserved Cyan strictly for verified learning deltas and safety permits; removed all decorative AI glows. |
| **Fabricated Metrics & Static Cards** | Replaced KPI cards with real-time incident spotlights; enforced strict data truth classifications (`LIVE`, `SIMULATION`, `STATIC`, `UNAVAILABLE`). |
| **"Liquid Glass" vs Industrial Carbon** | Eliminated frosted glass and blur; instituted crisp 1px `#232A36` wireframe borders and luminance depth. |

---

**Document Status**: **Refined UI Design Specification — implementation-ready after compliance with the Implementation Truth Contract.**


