# AutoFlow AI — Complete Project Setup & Port-Forwarding Guide

This guide provides the complete, authoritative instructions to start the **AutoFlow AI** autonomous control plane, with dedicated focus on **Kubernetes port forwarding**, service routing, and end-to-end verification.

---

## 1. System Architecture & Port Topology

AutoFlow AI connects 5 core systems in a closed autonomous loop. Each system communicates via specific local or port-forwarded ports:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PORT TOPOLOGY DIAGRAM                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [ React Dashboard UI ]                                                │
│    Local Port: 5173 (Vite Dev Server)                                  │
│         │                                                              │
│         │ (HTTP / WebSocket)                                           │
│         ▼                                                              │
│  [ Node.js Control Plane API ]                                         │
│    Port: 3001 (Local Node OR kubectl port-forward)                     │
│         ▲                    │                                         │
│         │ (Queries/Audit)    │ (Triggers Action)                       │
│         ▼                    ▼                                         │
│  [ Neon PostgreSQL ]   [ Remediation Microservice ]                    │
│    Cloud Database        Port: 3002 (Local Node OR port-forward)       │
│                              │                                         │
│                              │ (K8s API: kubectl / ClientNode)         │
│                              ▼                                         │
│  [ Kubernetes Cluster (Minikube) ]                                     │
│    ├── Namespaces: default, monitoring, stress-test                    │
│    │                                                                   │
│    ├── Prometheus Server ──► kubectl port-forward 9090:9090            │
│    │   (Scrapes targets & alerts Alertmanager)                         │
│    │                                                                   │
│    └── Alertmanager ───────► kubectl port-forward 9093:9093            │
│        (Pushes webhooks to n8n)                                        │
│         │                                                              │
│         ▼                                                              │
│  [ n8n Workflow Engine ]                                               │
│    Local Port: 5678 (Runs 4-Agent LLM Swarm via Groq)                  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Port-Forwarding Quick Reference

These port forwards bridge your Kubernetes cluster inside Minikube to your local host machine so that the backend, n8n, and web browser can communicate with in-cluster services.

> [!IMPORTANT]
> **Port-forward processes MUST stay open in their dedicated terminals** during the entire run. If a terminal terminates or drops, dependent components will fail with `ECONNREFUSED`.

| Service | Namespace | Service Name | In-Cluster Port | Local Port | Port-Forward Command | Required By |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Prometheus** | `monitoring` | `our-prometheus` | `9090` | **`9090`** | `kubectl port-forward -n monitoring svc/our-prometheus 9090:9090` | Backend `/metrics`, verification engine, UI |
| **Alertmanager** | `monitoring` | `our-alertmanager` | `9093` | **`9093`** | `kubectl port-forward -n monitoring svc/our-alertmanager 9093:9093` | Telemetry alerting pipeline to n8n |
| **Remediation API** *(if containerized)* | `default` | `autoflow-remediation-service` | `3002` | **`3002`** | `kubectl port-forward -n default svc/autoflow-remediation-service 3002:3002` | n8n Workflow 3/4 & Backend dispatcher |
| **Backend API** *(if containerized)* | `default` | `autoflow-backend-service` | `3001` | **`3001`** | `kubectl port-forward -n default svc/autoflow-backend-service 3001:3001` | Frontend UI dashboard & n8n webhooks |

*(Note: If running the backend and remediation services locally via `node index.js`, they bind directly to localhost `3001` and `3002`, so only Prometheus and Alertmanager require `kubectl port-forward`).*

---

## 3. Prerequisites Checklist

Before launching, ensure all required CLI tools are present and functional:

```powershell
docker --version         # Docker Desktop must be running (24.0+)
minikube version         # Minikube v1.30+
kubectl version --client # kubectl v1.28+
node -v                  # Node.js 18+ (Node 20 recommended)
npm -v                   # npm 9+
```

---

## 4. Step-by-Step Setup Sequence

### Step 1: Start Minikube & Set Up Cluster
Open a PowerShell terminal and start your local Kubernetes cluster:

```powershell
# 1. Start Minikube cluster
minikube start --driver=docker --cpus=4 --memory=8192

# 2. Create required namespaces
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace stress-test --dry-run=client -o yaml | kubectl apply -f -

# 3. Deploy the authoritative Prometheus and Alertmanager monitoring stack
kubectl apply -f "final integration/Kubernetes final/our-system.yaml"

# 4. Deploy the baseline stress-test target application
kubectl apply -f "final integration/Kubernetes final/stress-test.yaml"

# 5. Wait for monitoring pods to enter Running state
kubectl get pods -n monitoring -w
```
*(Wait until all pods in `monitoring` report `1/1 Running`).*

---

### Step 2: Establish Kubernetes Port-Forwards

Open two dedicated terminals (or background jobs) to establish the necessary port forwards:

#### Terminal A — Prometheus Port-Forward (Port 9090)
```powershell
kubectl port-forward -n monitoring svc/our-prometheus 9090:9090
```
*Expected log:*
`Forwarding from 127.0.0.1:9090 -> 9090`

#### Terminal B — Alertmanager Port-Forward (Port 9093)
```powershell
kubectl port-forward -n monitoring svc/our-alertmanager 9093:9093
```
*Expected log:*
`Forwarding from 127.0.0.1:9093 -> 9093`

---

### Step 3: Launch Remediation Service (Port 3002)

Open a new terminal for the remediation microservice:

```powershell
cd backend/remediation-service
npm install
npm start
```
*Expected output:*
`[autoflow-remediation-service] running on port 3002`

---

### Step 4: Launch Backend Control Plane (Port 3001)

Open a new terminal for the backend API:

```powershell
cd backend
npm install
npm start
```
*Expected output:*
`AutoFlow Backend listening on http://localhost:3001`

---

### Step 5: Start n8n Workflow Engine (Port 5678)

Open a new terminal to start n8n:

```powershell
npx n8n
```
1. Open your browser at **`http://localhost:5678/`**.
2. Import the two authoritative workflows from the repository:
   - **Workflows 1 & 2**: [`docs/AutoFlow AI 1 2 final.json`](docs/AutoFlow%20AI%201%202%20final.json)
   - **Workflows 3, 4 & 5**: [`docs/AutoFlow AI 3 4 5 final.json`](docs/AutoFlow%20AI%203%204%205%20final.json)
3. Ensure your **Groq API Key** (`gsk_...`) is populated in the 4 LLM agent HTTP nodes (`Anomaly`, `Risk`, `SLA`, `Context`).
4. **Activate** both workflows (toggle the switch to **Active**).

---

### Step 6: Launch Frontend UI Dashboard (Port 5173)

Open a new terminal for the dashboard:

```powershell
cd frontend
npm install
npm run dev
```
1. Open your browser at **`http://localhost:5173/`**.
2. Verify that:
   - The header shows `Connected` (green indicator).
   - Real-time telemetry indicators are streaming from the backend.
   - The 4-agent swarm status cards are in `idle` / `monitoring` state.

---

## 5. Port-Forward & Health Verification Commands

Run these verification commands in an active shell to confirm all port-forwarding channels are open and healthy:

### 1. Test Prometheus Port-Forward (Port 9090)
```powershell
Invoke-RestMethod -Uri "http://localhost:9090/-/healthy"
# Expected Output: Prometheus Server is Healthy.
```

Query live CPU metric:
```powershell
Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=up"
```

### 2. Test Alertmanager Port-Forward (Port 9093)
```powershell
Invoke-RestMethod -Uri "http://localhost:9093/-/healthy"
# Expected Output: OK
```

### 3. Test Backend API (Port 3001)
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/"
# Expected Output: { "status": "ok", "service": "AutoFlow Backend", ... }
```

### 4. Test Operator Auth Token Generation (Port 3001)
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/auth/token"
# Expected Output: { "token": "eyJhbGciOi...", "role": "operator" }
```

### 5. Test Remediation Microservice (Port 3002)
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/healthz"
# Expected Output: { "status": "ok", "service": "AutoFlow Remediation Service" }
```

---

## 6. One-Click Port-Forward Automation Script

To avoid opening multiple terminals manually for port forwarding, you can run this script to launch all required forwards in parallel:

### PowerShell Script (`start-port-forwards.ps1`)
Save or run this directly in PowerShell:

```powershell
Write-Host "Starting AutoFlow Kubernetes Port-Forwards..." -ForegroundColor Cyan

# Start Prometheus forward in background job
Start-Job -Name "PF-Prometheus" -ScriptBlock {
    kubectl port-forward -n monitoring svc/our-prometheus 9090:9090
}

# Start Alertmanager forward in background job
Start-Job -Name "PF-Alertmanager" -ScriptBlock {
    kubectl port-forward -n monitoring svc/our-alertmanager 9093:9093
}

Write-Host "Port forwards started successfully in background!" -ForegroundColor Green
Get-Job

Write-Host "`nTo check status: Get-Job" -ForegroundColor Yellow
Write-Host "To stop forwards: Get-Job | Stop-Job | Remove-Job" -ForegroundColor Yellow
```

---

## 7. Recommended Terminal Layout

For smooth development, arrange your terminals as follows:

```
┌─────────────────────────────────┬─────────────────────────────────┐
│ Terminal 1: Cluster / Minikube  │ Terminal 2: Prometheus Forward  │
│ kubectl get pods -A -w          │ (port-forward 9090:9090)        │
├─────────────────────────────────┼─────────────────────────────────┤
│ Terminal 3: Alertmgr Forward    │ Terminal 4: Remediation Service │
│ (port-forward 9093:9093)        │ cd backend/remediation-service  │
├─────────────────────────────────┼─────────────────────────────────┤
│ Terminal 5: Backend API Server  │ Terminal 6: Frontend Dashboard  │
│ cd backend && npm start (3001)  │ cd frontend && npm run dev      │
└─────────────────────────────────┴─────────────────────────────────┘
```

---

## 8. Troubleshooting Port-Forwarding Issues

### 1. `error: unable to forward port: listen tcp4 127.0.0.1:9090: bind: address already in use`
- **Cause**: Another process or an orphaned `kubectl` instance is already occupying the port.
- **Fix**:
  ```powershell
  # Find PID using port 9090
  Get-NetTCPConnection -LocalPort 9090 | Select-Object OwningProcess
  # Kill the process
  Stop-Process -Id <PID> -Force
  ```

### 2. `ECONNREFUSED 127.0.0.1:9090` or `127.0.0.1:9093`
- **Cause**: The `kubectl port-forward` terminal was closed, Minikube slept, or the target pod restarted.
- **Fix**:
  1. Verify the pod is still running: `kubectl get pods -n monitoring`
  2. Rerun the port-forward command in an active terminal.

### 3. Port-Forward Dies Upon Computer Sleep or Inactivity
- **Fix**: `kubectl port-forward` terminates when Windows enters sleep mode. Whenever waking your machine:
  1. Check Minikube status: `minikube status`
  2. Restart port-forwards using the commands in Section 2.

