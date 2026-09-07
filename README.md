# HustleX Team Workspace 🚀

A modern full-stack collaborative workspace application featuring **dynamic per-team role permissions**, an explicit **task verification state machine with immutable reviewer snapshotting**, **real-time Socket.IO collaboration**, an append-only **audit ledger**, and a **6-month internship progression roadmap**.

---

## 🏗 Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS (Vite) + Lucide React + date-fns
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL (Prisma ORM with Neon cloud / local PostgreSQL support)
- **Real-Time**: Socket.IO (room-based project channels, typing presence & system broadcast events)
- **Authentication**: JWT (Stateless token + **Dynamic per-request DB role verification**)
- **File Storage**: Local disk storage fallback (`server/uploads/` directory with static Express serving)

---

## ⚡ Core Architecture

### 1. Dynamic Per-Team Roles (Zero-Trust Security)
Roles are **not** a permanent property of a user and are **never cached inside the JWT**.
- **Roles**: `admin`, `lead`, `member`
- Stored on `team_members (team_id, user_id, role, joined_at, removed_at)` join table.
- A user can be an `admin` in Team A, a `lead` in Team B, and a `member` in Team C.
- Every API request runs through `requireTeamRole(['admin', 'lead', 'member'])`, which queries PostgreSQL live at request time.
- Role changes and leadership transfers automatically write an append-only entry to `activity_logs`.
- **Safe Member Removal with Task Reassignment**: When an admin attempts to remove a member who has open tasks, the system blocks the removal and requires selecting an active replacement member to reassign all open tasks to before completing removal.

### 2. Task Verification State Machine
Task verification is modeled as an explicit state machine enforced server-side:

```
Not Started ➔ In Progress ➔ Submitted ➔ Under Review ➔ Approved
                                              ↓
                                     Changes Required ➔ In Progress
```

- **Illegal Jumps Rejected**: Skipping steps (e.g. attempting to jump from `Not Started` directly to `Approved`) is rejected by the server with HTTP 400.
- **Self-Approval Prevention**: Members cannot approve their own work. Only the designated reviewer, team lead, or admin can approve or request changes.
- **Historical Snapshotting**: Past task reviews snapshot the reviewer's display name and current role at the exact moment of review into `reviewed_by_name_snapshot` and `reviewed_by_role_snapshot` in `task_reviews`. If that person's role later changes, historical audit integrity remains untouched.

### 3. Real-Time Socket.IO Collaboration
- Real-time project chat channels (`#CRM & Team Workspace Platform`, `#Mobile Client & Offline Sync`).
- `@mentions` with dropdown autocomplete and notification dispatch.
- Automated system messages broadcast on verification milestones (e.g., *"Devin Patel submitted 'CRM API Testing' for review"* or *"Alex Turner (ADMIN) approved 'Database Normalization'"*).

### 4. 6-Month Internship Timeline
- Month-by-month curriculum breakdown with interactive milestone checklist.
- Real-time progress bars (% completion).
- Inline milestone toggling and custom milestone editor for Admins and Leads.

---

## 👥 Seed Credentials (Password for all: `Password123!`)

| Name | Email | Default Role | Title |
|---|---|---|---|
| **Alex Turner** | `admin@hustlex.com` | `admin` | VP of Engineering & Workspace Admin |
| **Sarah Chen** | `lead@hustlex.com` | `lead` | Senior Engineering Team Lead |
| **Devin Patel** | `intern1@hustlex.com` | `member` | Full Stack Engineering Intern |
| **Maya Lin** | `intern2@hustlex.com` | `member` | Frontend UI/UX Intern |
| **Rahul Sharma** | `intern3@hustlex.com` | `member` | Backend Systems Intern |

> 💡 **Tip**: The login screen features a **1-Click Quick Persona Switcher** allowing instant persona testing without typing credentials.

---

## 🚀 Quick Start & Local Run

### Prerequisites
- Node.js v18+ (tested on Node v24)
- PostgreSQL connection (pre-configured with Neon cloud database in `.env`)

### 1. Install Dependencies
```bash
# In server directory
cd server
npm install

# In client directory
cd ../client
npm install
```

### 2. Configure Environment Variables
A configured `.env` file is ready in `server/.env`:
```ini
PORT=5000
DATABASE_URL="postgresql://neondb_owner:npg_lZXVUqsjMg93@ep-soft-shadow-aytc5lnq.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="hustlex_super_secure_jwt_secret_key_2026_workspace_token"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
UPLOAD_DIR="./uploads"
```

### 3. Initialize & Seed Database
```bash
cd server
npx prisma db push
npm run prisma:seed
```

### 4. Run State Machine Verification Tests
```bash
cd server
npm run test:state-machine
```

### 5. Start Development Servers
From the root directory:
```bash
# Start both backend and frontend concurrently
npm run dev

# Or start individually:
# Terminal 1: Backend (port 5000)
npm run dev:server

# Terminal 2: Frontend (port 5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📂 Project Structure

```
hustlex-team-workspace/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma        # 12 normalized PostgreSQL tables
│   │   └── seed.ts              # Seed data with tasks across all 6 states
│   ├── src/
│   │   ├── config/              # db.ts (Prisma), env.ts
│   │   ├── middleware/          # auth.ts (JWT & live per-team role check)
│   │   ├── routes/              # Express REST APIs (auth, teams, tasks, reviews, etc.)
│   │   ├── socket/              # socketHandler.ts (Socket.IO chat & presence)
│   │   ├── utils/               # stateMachine.ts, logger.ts
│   │   ├── tests/               # test-state-machine.ts (11 unit tests)
│   │   └── index.ts             # Express + HTTP + Socket.IO server
│   └── uploads/                 # Local disk file storage fallback
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Navbar.tsx, Sidebar.tsx
│   │   │   ├── tasks/           # StateMachineStepper.tsx, TaskCard.tsx, TaskModal.tsx, ReviewModal.tsx
│   │   │   ├── team/            # RoleChangeModal.tsx, RemoveMemberModal.tsx
│   │   │   ├── chat/            # ChatBox.tsx
│   │   │   └── internship/      # InternshipTracker.tsx
│   │   ├── context/             # AuthContext.tsx, SocketContext.tsx
│   │   ├── pages/               # 13 Functional Pages
│   │   ├── services/            # api.ts (Axios interceptor)
│   │   └── types/               # TypeScript interfaces
│   └── index.html
└── README.md
```
