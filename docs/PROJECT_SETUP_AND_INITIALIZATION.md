# AutoFlow AI — Complete Setup & Initialization Guide

This document is the authoritative, step-by-step guide to bring AutoFlow AI into a fully operational state on a clean machine.

---

## 1. Project Overview

**AutoFlow AI** is an autonomous IT operations control plane that detects infrastructure anomalies, runs a 4-agent consensus decision engine via LLM models, triggers automated Kubernetes remediations, verifies metric recovery, and updates a learning log.

### System Architecture Topology

```
[ Frontend Dashboard ] (Vite / React on Port 5173)
       │
       ▼ (HTTP / WebSocket)
[ Backend Control Plane ] (Node.js on Port 3001)
       ▲
       │ (Database Queries / Logging)
       ▼
[ PostgreSQL / Neon DB ] (Port 5432)
       ▲
       │ (Telemetry Webhook)
[ n8n Workflow Engine ] (Port 5678)
  ├── Workflow 1 & 2: Telemetry Ingestion -> Anomaly Detection -> 4-Agent LLM Swarm -> Consensus Engine
  └── Workflow 3 & 4: Action Webhook -> Remediation Execution -> Verification -> Learning
       ▲                                 │
       │ (Alert Push)                    ▼ (K8s API Calls)
[ Prometheus / Alertmanager ]    [ Remediation Service ] (Port 3002)
  (Ports 9090 / 9093)                    │
       ▲                                 ▼
       └─── [ Kubernetes Workloads / Minikube Cluster ] (Default & stress-test Namespaces)
```

---

## 2. Prerequisites

Verify every tool before proceeding:

| Prerequisite | Minimum Version / Requirement | Verification Command |
| :--- | :--- | :--- |
| **OS** | Windows 10/11 (PowerShell / WSL2) or Linux / macOS | `systeminfo` or `uname -a` |
| **Docker Desktop** | 24.0+ (Daemon running) | `docker info` |
| **Minikube** | v1.30+ | `minikube version` |
| **kubectl** | v1.28+ | `kubectl version --client` |
| **Node.js** | v18+ (Node 20 recommended) | `node -v` |
| **npm** | 9.0+ | `npm -v` |
| **n8n** | Running locally or containerized (Port 5678) | `curl -s http://localhost:5678/healthz` |
| **Groq API Key** | Valid API Key (`gsk_...`) | Configured in n8n nodes |

---

## 3. Repository Structure

```
.
├── backend/                        # Node.js Express Control Plane API (Port 3001)
│   ├── routes/                     # /event, /decision, /action, /simulate, /incidents
│   ├── manifests/                  # Authoritative K8s simulation YAML fixtures
│   ├── middleware/                 # JWT Auth & Role-based Access Control
│   └── Dockerfile                  # Production container definition (includes kubectl)
├── frontend/                       # Vite + React + Tailwind + Lucide Dashboard (Port 5173)
└── kubernetes/                     # Authoritative Kubernetes Manifests
    ├── postgres-statefulset.yaml   # Local PostgreSQL database + Schema init script
    ├── backend-deployment.yaml     # AutoFlow Backend Deployment & Secret (Image: autoflow-backend:v2.3.0)
    ├── backend-rbac.yaml           # RBAC for simulation triggers (includes Deployment patch verb)
    ├── remediation-deployment.yaml # Remediation Executor API (Port 3002)
    └── remediation-rbac.yaml       # Least-privilege RBAC for remediation service
├── final integration/
│   ├── N8N WORKFLOWS/                  # Authoritative n8n Workflow JSON definitions
│   │   ├── AutoFlow AI 1 2 (5).json    # Workflow 1 & 2: Telemetry & 4-Agent Swarm
│   │   └── AutoFlow AI 3 4 5 (4).json  # Workflow 3, 4 & 5: Remediation & Learning
│   └── Kubernetes final/
│       └── stress-test.yaml            # High CPU simulation manifest fixture
├── .env.local                          # Environment configuration & DB connection strings
└── docs/                               # Architecture and reconciliation documentation
```

> **Authoritative Directories**: Always use `upgraded/backend/`, `upgraded/frontend/`, `upgraded/kubernetes/`, and `final integration/N8N WORKFLOWS/`.

---

## 4. Environment Variables and Secrets

### Required Variables & Configuration Matrix

| Variable Name | Component | Purpose | Where Configured | User Action Required | Verification Command |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Backend / Postgres | PostgreSQL connection string | `.env.local` / Secret `autoflow-db-secret` | Optional (defaults to in-cluster Postgres) | `echo $env:DATABASE_URL` |
| `JWT_SECRET` | Backend / Remediation | Signing & validating auth tokens | Secret `autoflow-jwt-secret` | Pre-configured in K8s manifest | `kubectl get secret autoflow-jwt-secret -o jsonpath='{.data.JWT_SECRET}'` |
| `PORT` | Backend | Port for Express server (3001) | `backend-deployment.yaml` | None (fixed) | `kubectl get svc autoflow-backend-service` |
| `VITE_API_URL` | Frontend | Base URL for Control Plane API | `upgraded/frontend/src/lib/api.ts` | Default: `http://localhost:3001` | Verify frontend network calls |
| `GROQ_API_KEY` | n8n Workflows | LLM Provider key for 4-Agent Swarm | n8n HTTP Request Header | User provided in n8n HTTP nodes | Test HTTP node inside n8n UI |

---

## 5. Startup Sequence

Follow this exact dependency chain to start AutoFlow AI:

```
1. Docker Daemon
   └─► 2. Minikube Cluster
        └─► 3. PostgreSQL Database (StatefulSet)
             └─► 4. AutoFlow Backend API (Port 3001)
                  └─► 5. Remediation Service (Port 3002)
                       └─► 6. Prometheus & Alertmanager (Monitoring Stack)
                            └─► 7. Host Port Forwards (3001, 3002, 9090, 9093)
                                 └─► 8. n8n Engine (Port 5678)
                                      └─► 9. Frontend Dev Server (Port 5173)
```

---

## 6. Docker Setup

1. **Start Docker Desktop**: Launch Docker Desktop on Windows.
2. **Verify Daemon**:
   ```powershell
   docker info
   ```
3. **Point Shell to Minikube's Docker Daemon**:
   To allow Minikube to use locally built images without pushing to a remote registry:
   ```powershell
   minikube docker-env | Invoke-Expression
   ```
4. **Build Backend Container Image**:
   ```powershell
   cd "backend"
   docker build -t autoflow-backend:v2.3.0 .
   ```
   *(Note: The deployment manifest references `autoflow-backend:v2.3.0`. Retain this tag when building.)*
5. **Verify Image Availability inside Minikube**:
   ```powershell
   minikube image ls | Select-String "autoflow-backend"
   ```

---

## 7. Kubernetes & Infrastructure Initialization

### Step 1: Start Minikube
```powershell
minikube start --driver=docker --cpus=4 --memory=8192
```

### Step 2: Create Namespaces
```powershell
kubectl create namespace stress-test --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
```

### Step 3: Apply Kubernetes Infrastructure & Services
```powershell
cd "kubernetes"

# 1. PostgreSQL StatefulSet & Init Schema
kubectl apply -f postgres-statefulset.yaml

# 2. Remediation RBAC & Service
kubectl apply -f remediation-rbac.yaml
kubectl apply -f remediation-deployment.yaml

# 3. Backend RBAC & Control Plane Deployment (Includes patch verb for cpu-stress)
kubectl apply -f backend-rbac.yaml
kubectl apply -f backend-deployment.yaml

# 4. Stress Test Target Deployment Base
cd "../final integration/Kubernetes final"
kubectl apply -f stress-test.yaml
```

### Step 4: Verify All Pods are Running
```powershell
kubectl get pods -A
```

---

## 8. Backend & Remediation Service Verification

### 1. Verify Backend Health Endpoint
```powershell
# In terminal with port-forward 3001 active:
Invoke-RestMethod -Uri "http://localhost:3001/"
```
*Expected Output*: `{ "status": "ok", "service": "AutoFlow Backend" }`

### 2. Verify Auth Token Generation
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/auth/token"
```
*Expected Output*: `{ "token": "eyJhbG...", "role": "operator" }`

### 3. Verify Remediation Service Health
```powershell
# In terminal with port-forward 3002 active:
Invoke-RestMethod -Uri "http://localhost:3002/healthz"
```
*Expected Output*: `{ "status": "ok", "service": "AutoFlow Remediation Service" }`

---

## 9. Frontend Setup & Launch

1. **Install Dependencies**:
   ```powershell
   cd "frontend"
   npm install
   ```
2. **Start Vite Development Server**:
   ```powershell
   npm run dev
   ```
3. **Access Dashboard**:
   Open browser at `http://localhost:5173/`.
   *(Note: Vite runs directly on local port 5173. It is NOT a Kubernetes port-forward).*

---

## 10. PostgreSQL & Database Initialization

The PostgreSQL database initializes automatically via `postgres-init-script` ConfigMap in `postgres-statefulset.yaml`.

### Manual Connectivity & Table Verification
```powershell
# Connect to in-cluster PostgreSQL
kubectl exec -it postgres-0 -n default -- psql -U autoflow_user -d autoflow -c "\dt"
```
*Expected Tables*:
- `autoflow_events`
- `autoflow_decisions`
- `autoflow_actions`
- `autoflow_agent_weights`
- `autoflow_learning_log`

---

## 11. n8n Workflow Engine Configuration

### 1. n8n Access & Networking Matrix

| Host Environment | Context | Backend URL | Remediation URL |
| :--- | :--- | :--- | :--- |
| **n8n in Docker Desktop** | Container -> Host Port Forward | `http://host.docker.internal:3001` | `http://host.docker.internal:3002` |
| **n8n Local (Node.js / Host)** | Host Process | `http://localhost:3001` | `http://localhost:3002` |
| **n8n inside K8s Cluster** | ClusterIP Service | `http://autoflow-backend-service:3001` | `http://autoflow-remediation-service:3002` |

### 2. Workflow Import & Activation Steps
1. Open n8n UI at `http://localhost:5678/`.
2. Import Workflow 1 & 2: `final integration/N8N WORKFLOWS/AutoFlow AI 1 2 (5).json`.
3. Import Workflow 3 & 4: `final integration/N8N WORKFLOWS/AutoFlow AI 3 4 5 (4).json`.
4. Ensure both workflows are set to **Active** (toggle in upper right corner).
5. Verify Webhook URLs:
   - Telemetry Webhook: `POST /webhook/autoflow/telemetry`
   - Action Webhook: `POST /webhook/autoflow/action`

---

## 12. Required Port-Forwards Table

Keep these commands active in dedicated background terminals:

| Component | Local Port | Target Resource | Required Command | Must Stay Open? |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** | `3001` | `svc/autoflow-backend-service` | `kubectl port-forward -n default svc/autoflow-backend-service 3001:3001` | **YES** |
| **Remediation API** | `3002` | `svc/autoflow-remediation-service` | `kubectl port-forward -n default svc/autoflow-remediation-service 3002:3002` | **YES** |
| **Prometheus** | `9090` | `svc/our-prometheus` | `kubectl port-forward -n monitoring svc/our-prometheus 9090:9090` | **YES** |
| **Alertmanager** | `9093` | `svc/our-alertmanager` | `kubectl port-forward -n monitoring svc/our-alertmanager 9093:9093` | **YES** |

*(Note: Frontend Vite dev server running on port `5173` is a local Node process, not a Kubernetes port-forward).*

---

## 13. Terminal Management Guide

Recommended layout across 6 active terminals:

```
┌───────────────────────────────┬───────────────────────────────┐
│ Terminal 1: K8s / Cluster     │ Terminal 2: Backend Forward   │
│ (kubectl get pods -w)         │ (port-forward 3001) [STAY OPEN]│
├───────────────────────────────┼───────────────────────────────┤
│ Terminal 3: Remediation Forward│ Terminal 4: Prometheus Forward│
│ (port-forward 3002) [STAY OPEN]│ (port-forward 9090) [STAY OPEN]│
├───────────────────────────────┼───────────────────────────────┤
│ Terminal 5: Alertmgr Forward  │ Terminal 6: Frontend Dev      │
│ (port-forward 9093) [STAY OPEN]│ (npm run dev) [STAY OPEN]     │
└───────────────────────────────┴───────────────────────────────┘
```

---

## 14. Preflight Verification Checklist

Execute this checklist before running simulations:

- [ ] **[PASS] Docker**: `docker info` exits 0.
- [ ] **[PASS] Minikube**: `minikube status` shows Running.
- [ ] **[PASS] Pods**: `kubectl get pods -A` shows 1/1 Running for all workloads.
- [ ] **[PASS] Backend**: `curl http://localhost:3001/` returns `status: ok`.
- [ ] **[PASS] Remediation**: `curl http://localhost:3002/healthz` returns `status: ok`.
- [ ] **[PASS] Prometheus**: `curl http://localhost:9090/-/healthy` returns 200.
- [ ] **[PASS] Alertmanager**: `curl http://localhost:9093/-/healthy` returns 200.
- [ ] **[PASS] n8n**: `curl http://localhost:5678/healthz` returns 200.
- [ ] **[PASS] Frontend**: `http://localhost:5173/` loads control plane UI.

---

## 15. End-to-End Smoke Test Procedure

Verify complete autonomous cycle:

1. **Trigger High CPU Simulation**:
   Click **High CPU Usage** on frontend dashboard (`POST http://localhost:3001/simulate` with `{ type: "cpu" }`).
2. **Verify K8s Fault Injection**:
   ```powershell
   kubectl get deployment cpu-stress -n stress-test
   ```
   *Expected*: `replicas` set to 2 with stress arguments.
3. **Verify Alertmanager Trigger**:
   ```powershell
   kubectl exec -n monitoring our-alertmanager-0 -- wget -qO- http://localhost:9093/api/v2/alerts
   ```
   *Expected*: `ContainerHighCPU` alert in `FIRING` state.
4. **Verify n8n Execution**:
   Observe execution run in n8n UI -> 4-Agent LLM consensus evaluation -> Decision: `remediate`.
5. **Verify Remediation Action**:
   ```powershell
   kubectl get pods -n stress-test
   ```
   *Expected*: Pod restarted or deployment scaled, CPU rate drops.

---

## 16. Returning System to Clean State

To reset simulation without removing infrastructure:

```powershell
# Scale down cpu-stress simulation deployment
kubectl scale deployment cpu-stress -n stress-test --replicas=0

# Clean up memory/disk/pod fixtures if triggered
kubectl delete pod impossible-pod -n default --ignore-not-found
kubectl delete pod autoflow-sim-memory -n default --ignore-not-found
kubectl delete pod autoflow-sim-disk -n default --ignore-not-found
```

---

## 17. Troubleshooting Reference

| Symptom | Cause | Remedy / Command |
| :--- | :--- | :--- |
| `kubectl apply FAILED: path does not exist` | Docker build missing manifests COPY | Rebuild backend container image (`docker build -t autoflow-backend:v2.3.0 .`) |
| `Unauthorized: Missing bearer token` | Request to `/event`, `/decision`, `/simulate` missing JWT | Call `GET /auth/token` first to acquire operator token |
| `ECONNREFUSED 127.0.0.1:3001` | Port-forward terminal died | Rerun `kubectl port-forward -n default svc/autoflow-backend-service 3001:3001` |
| `ErrImageNeverPull` in K8s | Minikube daemon not used during build | Run `minikube docker-env \| Invoke-Expression` before building image |
| `500 Internal Server Error` in n8n Groq node | Invalid or missing Groq API Key | Update API key in n8n HTTP Request node header (`Bearer gsk_...`) |

---

## 18. Master Reproducibility Checklist

- [ ] Start Docker Desktop & set `minikube docker-env`.
- [ ] Build backend image `autoflow-backend:v2.3.0`.
- [ ] Start Minikube cluster with 4 CPUs, 8GB RAM.
- [ ] Create `stress-test` and `monitoring` namespaces.
- [ ] Apply manifests from `kubernetes/`.
- [ ] Start port-forwards for ports 3001, 3002, 9090, and 9093.
- [ ] Start n8n and activate workflows 1 & 2 and 3 & 4.
- [ ] Launch frontend with `npm run dev` in `frontend/` (port 5173).
- [ ] Execute High CPU simulation from UI and confirm autonomous recovery.
