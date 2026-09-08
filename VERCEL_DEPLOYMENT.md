# 🚀 Vercel Deployment Guide — Hustlex Team Workspace Frontend

This guide explains how to deploy the **Vite React Frontend** to **Vercel** with the backend hosted on **Render** (for persistent Socket.IO WebSockets).

> [!WARNING]
> ### 🛑 DO NOT DEPLOY BACKEND TO VERCEL
> **Do not create a Vercel project for the backend — it must run on Render per `render.yaml`. Only the `client/` folder should ever be deployed to Vercel.**
> If an accidental Vercel project named like the backend exists (e.g. `team-management-server`):
> 1. Delete the duplicate backend project in Vercel.
> 2. For the frontend project, verify **Settings** → **General** → **Root Directory**:
>    - If using root `vercel.json`: Root Directory = `./`, Build Command = `npm run build --prefix client`, Output Directory = `client/dist`.
>    - If using `client` directly: Root Directory = `client`, Build Command = `npm run build`, Output Directory = `dist`.

---

## ⚡ Recommended Setup: Root Directory = Repository Root (`./`)

### Step 1: Import Repository
1. Go to [vercel.com](https://vercel.com) and click **"Add New..."** → **"Project"**.
2. Select your repository **`anupmazumdar/Team-Management`**.

### Step 2: Configure Build & Root Directory
- **Root Directory**: `./` (Leave as repository root — do **NOT** change to `client/`). The repository uses a consolidated root `vercel.json` as the single source of truth.
- **Framework Preset**: `Vite` (or `Other`)
- **Build Command**: Automatically provided by root `vercel.json`: `npm run build --prefix client`
- **Output Directory**: Automatically provided by root `vercel.json`: `client/dist`

### Step 3: Add Environment Variables
Under **Environment Variables**, configure:

| Key | Example Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` | Live backend API URL on Render |
| `VITE_WS_URL` | `https://your-backend.onrender.com` | Live Socket.IO WebSocket URL on Render |
| `VITE_GOOGLE_CLIENT_ID` | `your-google-client-id.apps.googleusercontent.com` | (Optional) Google OAuth Client ID |
| `VITE_GITHUB_CLIENT_ID` | `your-github-client-id` | (Optional) GitHub OAuth Client ID |

### Step 4: Deploy
Click **"Deploy"**. Vercel will run the build command from root and deploy the compiled `client/dist` bundle.
The root `vercel.json` provides the necessary client-side SPA rewrites (`/(.*) -> /index.html`) so routing works seamlessly without 404s.

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
