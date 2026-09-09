# AutoFlow Architectural Decision Log

This document records the official, approved architectural decisions for the AutoFlow Cloud-Computing Upgrade.

---

## AD-DATA-001: Database Provider & Migration Policy
- **Status**: **APPROVED**
- **Decision**: PostgreSQL StatefulSet with persistent PVCs for local Kubernetes deployment, replacing the external Neon PostgreSQL dependency.
- **Migration Policy**: A clean project-controlled PostgreSQL database will be initialized at startup. Historical Neon database records will **not** be migrated; they remain part of the immutable pre-upgrade baseline.
- **Credential Storage**: Database credentials must be stored dynamically via Kubernetes Secrets; plaintext `.env` configurations are restricted from production cluster deployments.

---

## AD-GW-001: API Gateway & Traffic Ingress
- **Status**: **APPROVED**
- **Decision**: NGINX Ingress Controller as the target API ingress and traffic gateway layer.
- **Traffic boundaries**:
  - **Gateway Layer (NGINX)**: Responsible for edge ingress, traffic routing, TLS termination, and rate limiting.
  - **Application Layer (Microservices)**: Responsible for validating JWT signatures, verifying role-based authorization (RBAC) claims, and serving protected business endpoints.

---

## AD-TLS-001: TLS Termination Boundary
- **Status**: **APPROVED**
- **Decision**: HTTPS/TLS terminates at the API Ingress Gateway.
- **Security Scope**: Protects all public client traffic traversing external networks. Traffic inside the Kubernetes cluster overlay network remains unencrypted HTTP.

---

## AD-OPS-001: Workflow Orchestration Boundary
- **Status**: **APPROVED**
- **Decision**: Hybrid n8n architecture. n8n remains responsible for workflow coordination and alert pipeline event ingestion, but holds no direct Kubernetes API keys or cluster write privileges.

---

## AD-K8S-001: Kubernetes Remediation Executer
- **Status**: **APPROVED**
- **Decision**: Dedicated Kubernetes Remediation Service.
- **Safety Boundary**: The service serves as the execution gatekeeper. It enforces schema validations, idempotency filters, and runs under restricted Kubernetes RBAC.
- **Scope limit**: Initial implementation supports **Pod restarts** and **Deployment scaling** only. Autonomous node draining is excluded from the initial scope due to risk of cascading outages.

---

## AD-HPA-001: Kubernetes Autoscaling
- **Status**: **APPROVED**
- **Decision**: Deploy native Kubernetes Horizontal Pod Autoscaling (HPA) for routine workload scaling based on CPU/Memory load.
- **Distinction**: Native HPA handles routine load-based scaling, while the AutoFlow AI Remediation engine handles anomalous metric corrective actions.

---

## AD-AI-001: AI Consensus & Safety Quorum Gate
- **Status**: **IMPLEMENTED / VERIFIED**
- **Decision**: Server-authoritative quorum-based consensus safety logic (`upgraded/backend/utils/aiSafetyValidator.js`).
- **Safety Policy**:
  1. Inspect agent output; if malformed, non-numeric, `NaN`, `Infinity`, boolean, or out-of-domain float ($<0.0$ or $>1.0$), reject and exclude the agent from consensus scoring.
  2. Check valid-agent count. If valid agents are less than the minimum quorum ($< 3$ out of 4 expected: `anomaly`, `risk`, `sla`, `context`), abort automatic remediation and set `decision = 'manual_review'`, `remediation_action = null`, and `event.status = 'manual_review'`.
  3. Server-authoritative override: Client/caller-supplied fabricated `consensus_score` or `decision` parameters are ignored; consensus is calculated server-side over validated agent inputs.
  4. No malformed AI output can trigger automatic remediation.

---

## AD-LEARN-001: Outcome-Based Adaptive Agent Weighting
- **Status**: **APPROVED**
- **Decision**: Outcome-Based Adaptive Agent Weighting.
- **Policy**: Update agent weights dynamically based on the verified success of remediation actions, rather than agent confidence scores alone.
