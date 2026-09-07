# 🚀 Vercel Deployment Guide — Hustlex Team Workspace Frontend

This guide explains how to deploy the **Vite React Frontend** to **Vercel** with the backend hosted on **Render** (for persistent Socket.IO WebSockets).

---

## ⚡ Recommended Setup: Root Directory = `client`

### Step 1: Import Repository
1. Go to [vercel.com](https://vercel.com) and click **"Add New..."** → **"Project"**.
2. Select your repository **`anupmazumdar/Team-Management`**.

### Step 2: Configure Build & Root Directory
- **Framework Preset**: `Vite`
- **Root Directory**: Click "Edit" and select **`client`**
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)

### Step 3: Add Environment Variables
Under **Environment Variables**, configure:

| Key | Example Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` | Live backend API URL on Render |
| `VITE_WS_URL` | `https://your-backend.onrender.com` | Live Socket.IO WebSocket URL on Render |
| `VITE_AUTH0_DOMAIN` | `your-tenant.us.auth0.com` | (Optional) Auth0 SSO Domain |
| `VITE_AUTH0_CLIENT_ID` | `your-auth0-client-id` | (Optional) Auth0 SPA Client ID |

### Step 4: Deploy
Click **"Deploy"**. Vercel will install dependencies and compile the production bundle.
`client/vercel.json` provides the necessary client-side SPA rewrites (`/(.*) -> /index.html`) so routing works seamlessly without 404s.

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
