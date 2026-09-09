# AutoFlow Target-State System Requirements

**Date**: 2026-08-23
**Status**: **APPROVED PLANNING STATE**

---

## 1. Functional Requirements

### REQ-FUN-001: Telemetry Alert Ingestion
- **Description**: Ingest standard Alertmanager JSON webhook payloads.
- **Source Finding**: `KUBERNETES_BASELINE_VALIDATION.md`
- **Acceptance Criterion**: Incoming HTTP POST alerts parse successfully and push to the queue.
- **Priority**: High (P1)

### REQ-FUN-002: Incident Status Tracking
- **Description**: Log and monitor every incident state progression (`detected`, `decided`, `remediating`, `resolved`).
- **Source Finding**: `qa_010_result.json`
- **Acceptance Criterion**: Querying `/api/incidents` returns active states.
- **Priority**: High (P1)

---

## 2. Security Requirements

### REQ-GW-001: API Ingress Protection
- **Description**: NGINX Ingress handles SSL termination and enforces edge rate limiting.
- **Source Finding**: Direct monolithic routes.
- **Acceptance Criterion**: HTTP connections on port 80 redirect to HTTPS port 443. Traffic exceeding 100 req/min per IP returns HTTP 429.
- **Priority**: Critical (P0)

### REQ-SEC-001: App JWT Verification & RBAC Authorization
- **Description**: The application layer validates JWT signatures and evaluates role-based scopes before executing protected endpoints.
- **Source Finding**: Open backend routes.
- **Acceptance Criterion**: REST API calls without valid bearer tokens return HTTP 401. Requests matching invalid user roles return HTTP 403.
- **Priority**: Critical (P0)

### REQ-SEC-002: Kubernetes Secret Store
- **Description**: Inject database credentials and keys from Kubernetes Secrets.
- **Source Finding**: Cleartext `.env` files.
- **Acceptance Criterion**: Credentials read dynamically from mounting namespaces.
- **Priority**: Critical (P0)

---

## 3. Reliability & AI Safety Requirements

### REQ-SAFETY-001: AI Consensus Safety & Quorum Gate
- **Description**: Enforce quorum checking and reject malformed LLM outputs.
- **Source Finding**: `qa_005_result.json` (NaN score default remediation bug)
- **Acceptance Criterion**: Any agent score string evaluating to `NaN` or `Infinity` is rejected. If remaining valid agents drop below quorum (< 3), abort automated action and default to manual review.
- **Priority**: Critical (P0)

### REQ-LEARN-001: Outcome-Based Adaptive Agent Weighting
- **Description**: Update consensus agent weights based on verified recovery success.
- **Source Finding**: `qa_006_result.json`
- **Acceptance Criterion**: Weights are updated only when remediation outcome status is `success`.
- **Priority**: Major (P1)

---

## 4. Scalability Requirements

### REQ-SCALE-001: Horizontal Pod Autoscaling (HPA)
- **Description**: Deploy native Kubernetes HPA for services based on CPU/Memory thresholds.
- **Source Finding**: Microservice resource allocation.
- **Acceptance Criterion**: Native HPA scales pods independently of AutoFlow's anomaly-driven remediation actions.
- **Priority**: Major (P1)

---

## 5. Observability Requirements

### REQ-OBS-001: Live Telemetry Recovery Verification
- **Description**: Recovery status must be verified using actual metric values queried from Prometheus APIs.
- **Source Finding**: `qa_018_result.json` (Synthetic recovery bug)
- **Acceptance Criterion**: Recovery evaluates true when live metrics return within acceptable ranges (e.g. CPU < threshold).
- **Priority**: Critical (P0)

### REQ-OBS-002: Service Monitoring (Prometheus & Grafana)
- **Description**: Collect active metrics via Prometheus server scrapes and visualize health charts on Grafana dashboards.
- **Source Finding**: Local Prometheus service configuration.
- **Acceptance Criterion**: Prometheus Active Scraper targets read values successfully.
- **Priority**: High (P1)

### REQ-OBS-003: Centralized Logging (Future Scope)
- **Description**: Collect logs from all microservices into a centralized search query log stream.
- **Source Finding**: Scattered stdout/stderr logs.
- **Acceptance Criterion**: Centralized log collection is documented for future implementation phase.
- **Priority**: Optional (P3)

---

## 6. Kubernetes Requirements

### REQ-K8S-001: Restricted Remediation RBAC
- **Description**: Remediation Service runs under a restricted ServiceAccount. n8n and AI agents must have zero cluster write access.
- **Source Finding**: Unsecured Kubernetes API access.
- **Acceptance Criterion**: Remediation client role is limited to specific namespaces, verbs (get, list, patch), and resources (deployments, pods).
- **Priority**: High (P1)

### REQ-K8S-002: Real Orchestration Remediation
- **Description**: Execute actual pod restarts and deployment scaling operations via K8s API.
- **Source Finding**: `qa_017_result.json` (Simulated actions)
- **Acceptance Criterion**: Triggering scale action changes running replica counts in `kubectl get deployments`. Autonomous node drains are excluded.
- **Priority**: Critical (P0)

---

## 7. Persistence Requirements

### REQ-DATA-001: Clean PostgreSQL Persistence
- **Description**: Initialize local PostgreSQL StatefulSet; DB schema is versioned via migrations.
- **Source Finding**: Neon DB dependency.
- **Acceptance Criterion**: Connects to dynamic volumes. Historical Neon database records are not migrated.
- **Priority**: Critical (P0)

---

## 8. DevOps & Delivery Requirements

### REQ-DEV-001: CI/CD Pipeline (Future Scope)
- **Description**: Automate image builds and deployments via CI pipelines.
- **Source Finding**: Feature inventory.
- **Acceptance Criterion**: Classified as optional/future scope.
- **Priority**: Optional (P3)
