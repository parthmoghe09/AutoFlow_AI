AutoFlow AI — Project Reconciliation & System Validation Plan

============================================================
INTRODUCTION
============================================================

1. Purpose

AutoFlow AI is intended to operate as a closed-loop autonomous IT operations platform in which infrastructure anomalies are detected, evaluated by a multi-agent system, subjected to a safety-controlled decision process, remediated through Kubernetes, and verified through live telemetry. The resulting outcome is then persisted and used for adaptive learning.

The current implementation contains the major components required for this architecture, but the system must now be reconciled as a single end-to-end platform rather than validated as isolated components. Previous testing has identified issues involving database connectivity and persistence, runtime configuration, alert delivery, Kubernetes permissions, execution correlation, and UI state. These issues can cause individual components to appear functional while the complete lifecycle remains unreliable.

This reconciliation plan defines the controlled process for bringing the implementation back into alignment with the intended AutoFlow architecture and verifying that the complete operational lifecycle functions correctly.

The target lifecycle is:

Telemetry → Anomaly → Swarm → Consensus → Safety Gate → Kubernetes Mutation → Verification → Learning

with the supporting system flow:

UI → Backend → Kubernetes → Prometheus → Alertmanager → n8n → AI Swarm → Consensus/Safety → Remediation → Kubernetes → Prometheus Verification → Learning → PostgreSQL/Neon → UI

The objective is therefore not simply to make each component operational. The objective is to demonstrate that these components operate together as one causal execution chain, with real infrastructure state, real telemetry, real remediation, real verification, and correctly correlated persistence.

2. Reconciliation Approach

The reconciliation will be performed incrementally and evidence-first.

The system will be divided into logical phases, with no more than two closely related phases executed in a single implementation cycle. Each phase will:

Establish the current state.
Identify deviations from the intended architecture.
Apply only the changes required to correct those deviations.
Verify the corrected component and its interfaces.
Record evidence and define an explicit exit criterion.

A downstream phase must not be used to compensate for or conceal an upstream failure.

The final end-to-end test will only be performed after the underlying phases have individually satisfied their exit criteria.

3. Reconciliation Principles

The following principles govern all reconciliation work:

Preserve the existing AutoFlow architecture. Existing agent, consensus, safety, remediation, verification, learning, and persistence mechanisms should be corrected rather than unnecessarily replaced.
No bypasses. The real causal path through Kubernetes, Prometheus, Alertmanager, n8n, the agent swarm, safety gate, remediation, verification, and learning must remain intact.
No simulated success. HTTP 200 responses, UI status indicators, workflow completion, or generated values are not sufficient evidence of successful execution.
Real infrastructure state is authoritative. Kubernetes state and Prometheus telemetry must determine whether an incident occurred and whether remediation succeeded.
Database state is authoritative for persistence. The active Neon database must contain the records corresponding to the current execution.
Execution correlation is mandatory. execution_id, event_id, decision_id, action_id, verification, learning, and agent-weight state must be traceable to the same lifecycle.
No unnecessary scope expansion. Diagnostic scripts, credential-generation utilities, agent replacements, workflow rewrites, or architectural changes must not be introduced unless a demonstrated defect requires them.
Evidence before progression. A phase is complete only when its defined acceptance criteria are independently verified.
4. Target System

The reconciled system must support the following eight-stage autonomous lifecycle:

Stage	Function
1. Telemetry	Real infrastructure telemetry is generated and collected
2. Anomaly	Infrastructure anomalies are identified and analyzed
3. Swarm	Anomaly, Risk, SLA, and Context agents independently evaluate the incident
4. Consensus	Agent outputs are combined through the existing weighted consensus mechanism
5. Safety Gate	The proposed action is evaluated against the existing safety constraints
6. Kubernetes Mutation	The authorized remediation is executed against the actual Kubernetes environment
7. Verification	Prometheus confirms whether the infrastructure recovered
8. Learning	The outcome is persisted and used for adaptive agent-weight handling

The final acceptance criterion is a single real browser-triggered HIGH CPU execution that traverses this complete lifecycle without bypasses, fabricated state, or stale execution data.

This is an IMPLEMENTATION + VERIFICATION task.

The complete infrastructure path is:

Browser UI
  ↓
Backend / simulation API
  ↓
Kubernetes fault injection
  ↓
Prometheus telemetry
  ↓
Prometheus alert
  ↓
Alertmanager
  ↓
n8n
  ↓
4-Agent Swarm
  ↓
Consensus
  ↓
Safety Gate
  ↓
Remediation service
  ↓
Kubernetes mutation
  ↓
Prometheus recovery telemetry
  ↓
Verification
  ↓
Learning
  ↓
PostgreSQL / Neon
  ↓
Agent-weight update
  ↓
Socket.IO / UI real-time state

============================================================
CRITICAL ARCHITECTURAL RULES
============================================================

DO NOT bypass any stage.

The authoritative causal chain MUST remain:

Kubernetes telemetry
→ Prometheus
→ Alertmanager
→ n8n
→ 4-agent swarm
→ consensus
→ safety gate
→ Kubernetes remediation
→ Prometheus verification
→ learning
→ PostgreSQL persistence
→ updated agent weights

DO NOT implement:

UI → n8n direct trigger
UI → database direct write
UI → remediation direct call
UI → fake telemetry
UI → fake verification
UI → synthetic learning result
n8n direct remediation that bypasses the existing safety gate
hardcoded success states
timer-based pipeline progression

The Browser UI must initiate the actual simulation.

CLI tools may be used for:
- inspection
- logs
- configuration verification
- database queries
- Prometheus queries
- Kubernetes state inspection
- passive diagnosis

CLI tools MUST NOT be used to manually advance the acceptance lifecycle.

============================================================
PHASE 0 — AUDIT BEFORE CHANGES
============================================================

Before changing anything, inspect the current state of:

BACKEND
- API routes
- simulation route
- incident/event/decision/action routes
- DB connection
- environment loading
- authentication
- Socket.IO
- remediation integration
- verification integration
- learning integration

DATABASE
- active Neon target
- schema
- foreign keys
- event persistence
- decision persistence
- action persistence
- learning persistence
- agent-weight persistence

PROMETHEUS
- running instance
- alert rules
- current alert state
- metric availability
- simulation-related telemetry

ALERTMANAGER
- configuration
- receiver
- webhook destination
- routing
- active/inactive state
- delivery failures

n8n
- active workflows
- telemetry webhook
- normalization
- event persistence
- 4 agent nodes
- consensus
- safety gate
- action/remediation workflow
- verification
- learning
- PostgreSQL credentials
- ID propagation

KUBERNETES
- namespaces
- simulation fixtures
- remediation service
- service account
- Roles/RoleBindings
- actual remediation permissions
- Prometheus scraping
- workload state

UI
- Trigger Simulation
- HIGH CPU option
- authentication
- execution_id handling
- Socket.IO events
- pipeline visualization
- current-execution isolation
- telemetry visualization
- verification chart
- learning state

DO NOT create large collections of scratch scripts.

Prefer inspecting existing code/configuration directly.

If a temporary diagnostic file is absolutely necessary, create the minimum possible and explain why.

DO NOT modify anything during the audit unless required to prevent an immediate destructive/runtime issue.

============================================================
PHASE 1 — RESTORE DATABASE
============================================================

Fix the proven Neon configuration problem.

The backend must connect to the verified active Neon database:

ep-misty-mountain-azpxi7z2-pooler.c-3.ap-southeast-1.aws.neon.tech

Do not use:
- localhost PostgreSQL
- stale ep-lively-glade database
- another unintended database

Inspect environment precedence.

Remove the known localhost override from the backend startup configuration.

Do not blindly overwrite passwords or credentials.

Verify the ACTUAL RUNNING Node.js backend process resolves to the active Neon target.

The backend must stop falling back to:

"DB unavailable — using mock incidents"

for a healthy database.

Mock data MUST NOT be the authoritative source for the E2E test.

============================================================
PHASE 2 — RESTORE DATABASE PERSISTENCE CHAIN
============================================================

Verify/fix:

autoflow_events
autoflow_decisions
autoflow_actions
autoflow_learning_log
autoflow_agent_weights

Preserve all existing foreign-key constraints.

Fix the known n8n learning failure:

event_id = undefined
decision_id = undefined

The real IDs from the current execution must propagate through the workflow.

Required correlation:

execution_id
→ event_id
→ decision_id
→ action_id
→ learning

No hardcoded IDs.

No nullable-FK workaround.

No fake records.

============================================================
PHASE 3 — RESTORE PROMETHEUS + ALERTMANAGER
============================================================

At nominal startup:

Prometheus alerts must be INACTIVE.

Do not leave a persistent CPU fault running merely to demonstrate that alerting works.

The HIGH CPU simulation must create the actual Kubernetes condition ON DEMAND.

Required flow:

UI HIGH CPU
→ ephemeral K8s fault
→ real CPU telemetry
→ Prometheus alert transitions
→ Alertmanager receives/routes firing alert
→ n8n webhook receives event

Do not directly POST the simulated alert into n8n.

Verify the actual Alertmanager delivery.

============================================================
PHASE 4 — RESTORE n8n AGENTIC SWARM
============================================================

The existing n8n 4-agent swarm is authoritative.

The four agents are:

- Anomaly
- Risk
- SLA
- Context

Preserve the existing agent architecture.

Verify that a real Alertmanager event reaches the swarm.

Verify:
- each applicable agent executes
- agent outputs are produced
- agent confidence/reasoning is available
- consensus receives the real outputs
- no agent is silently replaced by a shortcut/code stub unless the existing architecture already requires it

Do not redesign the swarm.

Do not replace the agentic architecture merely to make the test pass.

============================================================
PHASE 5 — RESTORE CONSENSUS + SAFETY GATE
============================================================

Verify the existing weighted consensus engine.

Verify the safety gate evaluates the existing safety criteria.

The safety gate must remain a genuine decision boundary.

Do not automatically approve remediation.

The resulting decision must be one of the architecture's legitimate outcomes:

REMEDIATE
ALERT
IGNORE

For a valid HIGH CPU incident, the expected path should reach remediation if the existing policies/agents determine that remediation is safe.

Persist the actual decision to PostgreSQL.

============================================================
PHASE 6 — RESTORE REAL KUBERNETES REMEDIATION
============================================================

The remediation must mutate the actual Kubernetes environment.

Verify:
- remediation service is reachable
- authentication/service account works
- Role/RoleBinding permissions are correct in the LIVE simulation namespace
- required pod/service resources can actually be mutated

Do not interpret HTTP 200 alone as successful remediation.

Prove the Kubernetes state changed.

Do not silently fall back to a simulated remediation.

============================================================
PHASE 7 — RESTORE REAL PROMETHEUS VERIFICATION
============================================================

After remediation:

Prometheus must observe the actual recovery.

Verification must use real Prometheus samples.

Do NOT:
- fabricate chart points
- generate synthetic recovery values
- use timers
- assume HTTP 200 means recovery
- mark verification successful merely because Kubernetes mutation succeeded

The verification result must correspond to the current action/execution.

The UI verification chart must represent actual collected telemetry.

If insufficient real samples exist, display an honest waiting/insufficient-telemetry state rather than fabricating data.

============================================================
PHASE 8 — RESTORE LEARNING
============================================================

After verified remediation:

The learning stage must execute.

Persist the learning outcome to PostgreSQL.

Verify that:
- event_id is valid
- decision_id is valid
- action correlation is valid where applicable
- no FK error occurs
- learning corresponds to the current execution

Then verify agent-weight persistence.

Capture weights before and after the execution.

Do not artificially force a weight change.

If the learning algorithm legitimately produces the same values, prove that the learning calculation and persistence executed correctly.

Verify the next decision path consumes the persisted weight state according to the existing architecture.

============================================================
PHASE 9 — RESTORE UI REAL-TIME EXECUTION STATE
============================================================

The UI must reflect the ACTUAL current execution.

The execution lifecycle shown by the UI must be:

Telemetry
→ Anomaly
→ Swarm
→ Consensus
→ Safety Gate
→ K8s Mutation
→ Verification
→ Learning

Do not advance stages using arbitrary timers.

Do not attach the UI to an old unresolved incident.

Do not use stale execution state.

The current execution must be correlated using the authoritative execution/event/decision/action identifiers returned by the backend/workflow.

Run isolation must work:

Run A completes or fails
→ Run B begins
→ UI clears Run A transient state
→ UI shows ONLY Run B as active

The UI must not display stale Run A state during Run B.

Socket.IO events must correspond to the actual backend/workflow lifecycle.

============================================================
PHASE 10 — ONE REAL UI E2E ACCEPTANCE TEST
============================================================

ONLY after all infrastructure components are healthy:

1. Ensure nominal Prometheus alerts are INACTIVE.
2. Establish a baseline in active Neon for:
   - events
   - decisions
   - actions
   - learning
   - agent weights
3. Open the actual AutoFlow browser UI.
4. Click:
   Trigger Simulation
   → HIGH CPU
5. Do not manually advance anything.

Passively observe the complete lifecycle.

Record:

execution_id
event_id
decision_id
action_id

Then verify:

Telemetry PASS
Anomaly PASS
Swarm PASS
Consensus PASS
Safety Gate PASS
K8s Mutation PASS
Verification PASS
Learning PASS

============================================================
PHASE 11 — AUTHORITATIVE CROSS-SYSTEM PROOF
============================================================

For the ONE UI-triggered execution, prove the same execution across:

BROWSER UI
↓
BACKEND
↓
PROMETHEUS
↓
ALERTMANAGER
↓
n8n
↓
KUBERNETES
↓
PROMETHEUS VERIFICATION
↓
POSTGRESQL / NEON

Prove:

execution_id
→ event_id
→ decision_id
→ action_id
→ verification
→ learning
→ agent weights

all correspond to the same incident lifecycle.

============================================================
DATABASE ACCEPTANCE
============================================================

The active Neon database must contain the new records for this execution.

Verify:

autoflow_events
autoflow_decisions
autoflow_actions
autoflow_learning_log
autoflow_agent_weights

Compare against the pre-test baseline.

Also verify the new execution did NOT land in:

- stale Neon
- localhost PostgreSQL
- another unintended database

Do not migrate historical records as part of this task.

============================================================
FINAL ACCEPTANCE REPORT
============================================================

Do NOT report "100% PASS" merely because services are running.

Provide:

### Infrastructure Status

Backend:
Prometheus:
Alertmanager:
n8n:
Kubernetes:
PostgreSQL/Neon:
Frontend:
Socket.IO:

### 8-Stage Lifecycle

| Stage | Expected | Actual Evidence | Status |
|---|---|---|---|
| 1. Telemetry | Real K8s telemetry | | PASS/FAIL |
| 2. Anomaly | Real anomaly detection | | PASS/FAIL |
| 3. Swarm | 4 agents execute | | PASS/FAIL |
| 4. Consensus | Weighted consensus | | PASS/FAIL |
| 5. Safety Gate | Genuine safety decision | | PASS/FAIL |
| 6. K8s Mutation | Actual mutation | | PASS/FAIL |
| 7. Verification | Real Prometheus recovery | | PASS/FAIL |
| 8. Learning | Persisted learning + weights | | PASS/FAIL |

### Persistence

| Record | ID | Current Execution | Neon Persisted | Status |
|---|---|---|---|---|
| Event | | | | |
| Decision | | | | |
| Action | | | | |
| Verification | | | | |
| Learning | | | | |
| Agent Weights | | | | |

### Root Cause / Fix

A. FIRST FAILURE POINT
B. EXACT ERROR
C. COMPONENT RESPONSIBLE
D. ACTIVE NEON REACHABLE?
E. RUNNING BACKEND USING ACTIVE NEON?
F. n8n USING ACTIVE NEON?
G. LAST SUCCESSFUL WRITE BEFORE FIX
H. FIRST FAILED WRITE
I. DATA WRITTEN ELSEWHERE?
J. STALE ENVIRONMENT/PROCESS INVOLVED?
K. FIX APPLIED
L. COMPLETE FEATURE COVERAGE
M. FINAL UI-ONLY E2E RESULT

============================================================
STOP CONDITIONS
============================================================

If any stage fails:

- report the exact failure;
- identify the first failing component;
- do not mask it with a fallback;
- do not fabricate success;
- fix the root cause if it is within the authorized scope;
- rerun the relevant validation;
- continue until the complete chain is proven or a genuine external blocker is identified.

Do not declare completion based on code changes alone.

The final acceptance criterion is:

ONE real Browser UI HIGH CPU trigger successfully traverses all 8 stages through the real AutoFlow architecture, with actual Kubernetes mutation, actual Prometheus recovery verification, correct PostgreSQL/Neon persistence, correct learning/agent-weight handling, and a UI that reflects the same execution in real time.

The system must work as ONE integrated AutoFlow platform — not as individually passing components.