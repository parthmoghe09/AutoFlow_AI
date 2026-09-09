# AutoFlow Current-State → Target-State Gap Analysis

**Date**: 2026-08-23
**Status**: **APPROVED PLANNING STATE**

---

## 1. Upgrade Gap Matrix

### A. Core Architecture
- **Current State**: Monolithic Express.js backend with coupled workflows.
- **Target Requirement**: Decoupled microservices (Ingest, Decision, Remediation, Learning) running in cluster.
- **Classification**: **NEW**

### B. API / Traffic Management
- **Current State**: Direct Express backend on host port `3001` with no gateway layer.
- **Target Requirement**: Ingress, TLS termination, and rate limiting handled by NGINX Ingress Controller. JWT authentication and role-based authorization validated at the application/microservice layer.
- **Classification**: **NEW**

### C. Database / Persistence
- **Current State**: Hardcoded dependency on external Neon PostgreSQL instance.
- **Target Requirement**: PostgreSQL StatefulSet with persistent PVCs. Clean database initialized at startup (no Neon records migrated). Credentials stored in Kubernetes Secrets.
- **Classification**: **REPLACED**

### D. Kubernetes & Remediation
- **Current State**: Simulated commands logged in n8n nodes; no K8s API interactions.
- **Target Requirement**: Real orchestration remediation (Pod restarts, Deployment scaling only; node drains excluded) via a Dedicated Remediation Service under restricted RBAC namespace scopes.
- **Classification**: **REPLACED**

### E. AI Safety & Consensus
- **Current State**: Malformed score string yields `NaN` consensus, triggering unsafe automatic remediations.
- **Target Requirement**: Reject malformed outputs, exclude invalid agents from consensus scoring, check valid-agent quorum (< 3 valid agents defaults to manual review with zero automatic action).
- **Classification**: **MODIFIED**

### F. Observability & Recovery
- **Current State**: `Evaluate Recovery` calculates recovery using `Math.random()`.
- **Target Requirement**: Live recovery verification via actual Prometheus API queries checking target metrics (CPU, latency, replica status) against runtime thresholds.
- **Classification**: **REPLACED**

### G. Learning Algorithm
- **Current State**: Weight updates reward agent score > 0.5 regardless of success.
- **Target Requirement**: Outcome-Based Adaptive Agent Weighting. Weights are updated only when remediation outcome status is verified as `success`.
- **Classification**: **MODIFIED**

### H. DevOps & Delivery
- **Current State**: Manual build and manual deployment configs.
- **Target Requirement**: CI/CD build/deploy automation is classified as future/optional scope.
- **Classification**: **FUTURE/OPTIONAL**
