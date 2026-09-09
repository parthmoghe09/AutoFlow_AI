# AutoFlow Backend

Node.js + Express API server — the connective tissue between n8n, Neon DB, and the React frontend.

## Quick Start

```bash
cd backend
npm install
# Edit .env and fill in your Neon DB password
npm run dev
```

Server runs on **http://localhost:3001**

---

## Endpoints

### Frontend → Backend (Omkar/Bhavesh call these)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/incidents` | Full incident feed (event + decision + action joined) |
| GET | `/metrics` | Dashboard KPIs: MTTR, success rate, anomaly count |
| GET | `/weights` | Agent weights for the learning panel |
| POST | `/simulate` | Trigger a demo CPU spike into the n8n pipeline |

### n8n → Backend (Devang's workflows call these)

| Method | Path | Called by | Description |
|--------|------|-----------|-------------|
| POST | `/event` | Workflow 1 | Store normalized event after anomaly detection |
| POST | `/decision` | Workflow 2 | Store agent consensus decision |
| POST | `/action` | Workflow 4 | Store Kubernetes remediation outcome |

---

## Socket.io Events (pushed to frontend)

| Event | Triggered by | Payload |
|-------|-------------|---------|
| `incident_update` | POST /event, /decision, /action | Latest incident state |
| `simulation_triggered` | POST /simulate | Simulation status |

Frontend connects with:
```js
import { io } from "socket.io-client";
const socket = io("http://localhost:3001");
socket.on("incident_update", (data) => { /* update UI */ });
```

---

## Environment Variables (.env)

```
NEON_HOST=ep-lively-glade-a1io9059-pooler.ap-southeast-1.aws.neon.tech
NEON_DB=neondb
NEON_USER=neondb_owner
NEON_PASSWORD=your_password_here
N8N_WEBHOOK_URL=http://localhost:5678/webhook/autoflow/telemetry
PORT=3001
```

---

## Mock Fallback

All GET endpoints fall back to `mockData.js` if the DB is unreachable.
This means the frontend and demo always work even without a live DB connection.
