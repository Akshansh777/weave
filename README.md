# WEAVE — AI Alumni Talent Engine

WEAVE transforms dormant university alumni directories into high-velocity talent and mentorship engines through intent-based matching (Asks & Offers), warm introductions, and skill gap radar. Initial launch institution: **IIT Delhi Pilot**.

---

## Adapter Architecture

WEAVE follows a strict **Adapter Pattern** decoupling the entire React UI and state layers from underlying storage technologies:

[ UI Layer / React Pages ]
│
▼
useData() Hook
│
▼
DataAdapter Interface
(/src/data/DataAdapter.ts)
│
┌─────────┴─────────┐
▼                   ▼
SimulatorAdapter    LiveAdapter (Firebase/Firestore)
▲                   ▲
└─────────┬─────────┘
│
HybridAdapter
(Automatic Phase-In)


### 1. The `DataAdapter` Contract (`/src/data/DataAdapter.ts`)
The entire application interacts exclusively with this interface. It exposes asynchronous CRUD operations and subscription APIs for:
- **Institutions**: verification & profile
- **Users**: student, alumni, faculty, recruiter directory
- **Posts**: real-time intent streams (Asks & Offers) with pub-sub
- **Opportunities**: job, internship, research, and mentorship boards
- **Warm Introductions**: multi-party intro lifecycles and connector routing
- **Radar**: skill-gap benchmarks against alumni cohorts
- **Outcomes**: tracking mentorship sessions, referrals, and placements
- **Notifications & Audit**: security events and alerts

### 2. Modes (`simulator`, `hybrid`, `live`)
- **`SimulatorAdapter`**: In-memory + deterministic Mulberry32 PRNG generator simulating 1,065 users (IIT Delhi), 300 posts, 80 opportunities, and historical intros with artificial latency (80–240ms).
- **`LiveAdapter`**: Cloud Firestore / Firebase persistence implementation.
- **`HybridAdapter`**: Wraps both adapters. When real records exist in Firestore, they are phased in, replacing simulated records entity-by-entity without code changes.

### 3. How to Plug in Live Data
To connect real backend storage (e.g. Firebase Firestore):
1. Implement the methods in `/src/data/LiveAdapter.ts` using Firestore collection references (`users`, `posts`, `opportunities`, `intros`, `outcomes`).
2. Set the environment variable:
   ```bash
   VITE_DATA_MODE="live" # or "hybrid"
Or toggle the runtime switch in the UI at Settings → Simulator Control Center (/settings/simulator).

The UI seamlessly consumes the live data with zero component modifications.


---
