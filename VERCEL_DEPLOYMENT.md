# 🚀 Vercel Deployment Guide — Hustlex Team Workspace

This repository is pre-configured for seamless deployment to **Vercel**.

---

## ⚡ Option 1: Direct Vercel Full-Stack Deployment (Recommended)

Vercel will build the frontend React/Vite application as static assets and deploy the backend Express API via Vercel Serverless Functions in `api/index.ts`.

### Step 1: Push to GitHub
Ensure the latest code is on your repository:
```bash
git remote add origin https://github.com/anupmazumdar/Team-Management.git
git branch -M main
git push -u origin main
```

### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** → **"Project"**.
3. Import the repository **`anupmazumdar/Team-Management`**.

### Step 3: Configure Project Settings in Vercel
The repository includes a root `vercel.json` and root `package.json` that handles builds automatically:
- **Framework Preset**: Other (or Vite)
- **Root Directory**: `./` (Leave as root)
- **Build Command**: `npm run vercel-build` (Pre-configured in `vercel.json`)
- **Output Directory**: `client/dist` (Pre-configured in `vercel.json`)

### Step 4: Add Environment Variables
In the Vercel Project Settings → **Environment Variables**, add:

| Key | Example / Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-soft-shadow-aytc5lnq.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require` | Neon Serverless PostgreSQL connection string |
| `JWT_SECRET` | `hustlex_workspace_jwt_secret_key_prod_2025` | Secret key for signing JWT tokens |
| `NODE_ENV` | `production` | Environment mode |

### Step 5: Deploy
Click **"Deploy"**. Vercel will:
1. Generate the Prisma Client schema.
2. Build the optimized Vite React frontend.
3. Package the Express API serverless functions under `/api/*`.

---

## 🌐 Option 2: Split Architecture (Vercel Frontend + Render/Railway Backend)

If you require persistent, long-lived WebSockets for 24/7 Socket.IO team chat, you can host the Express server on Render, Railway, or Fly.io, and host the Vite frontend on Vercel:

1. **Deploy Backend**:
   - Host `server/` on [Render.com](https://render.com) or [Railway.app](https://railway.app).
   - Set `DATABASE_URL` and `JWT_SECRET`.
   - Build Command: `npm install && npm run prisma:generate && npm run build`
   - Start Command: `npm run start` (or `npx tsx src/index.ts`)
2. **Deploy Frontend on Vercel**:
   - Set Root Directory to `client/`.
   - Add Environment Variables:
     - `VITE_API_URL`: `https://your-backend.onrender.com/api`
     - `VITE_WS_URL`: `https://your-backend.onrender.com`

---

## 🎯 Features Included & Verified

1. **Mission Assignment & Directives**:
   - Create tasks with detailed **Mission Briefing**, scope boundaries, and SLA criteria.
2. **Team Member Task Acceptance**:
   - Assignees can explicitly click **"🎯 Accept Mission & Start Work"** to commit to the assignment.
   - Acceptance timestamp (`acceptedAt`) and member ID (`acceptedById`) are permanently recorded.
3. **On-Time SLA Delivery Tracking**:
   - Automatic comparison of delivery timestamp (`deliveredAt`) against deadline upon submission.
   - Badges indicate **"🚀 Delivered On-Time (Within SLA)"** or **"⚠️ Delivered Past Deadline"**.
   - Live **On-Time SLA %** rate dynamically calculated for each member in the Team Governance table.
4. **Verification State Machine**:
   - Strict progression: `NOT_STARTED` → `IN_PROGRESS` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` / `CHANGES_REQUIRED`.
   - Audit trail with immutable snapshots of reviewer names and roles.
5. **6-Month Internship Progression Roadmap**:
   - Visual milestone checkpoints (Onboarding → Foundations → Core Contributor → Advanced Lead → Final Evaluation & Certification).
