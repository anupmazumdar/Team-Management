# 🚀 Deployment Guide: Frontend on Vercel & Backend on Render

This guide walks you through deploying **Hustlex Team Workspace** with:
- **Backend API & WebSockets** on **Render** (Node.js Web Service)
- **Frontend SPA** on **Vercel** (Global Edge CDN)
- **Database** on **Neon PostgreSQL** (Cloud Serverless Database)

---

## 🏗️ Architecture & Credentials Summary

- **GitHub Repository**: [https://github.com/anupmazumdar/Team-Management](https://github.com/anupmazumdar/Team-Management)
- **Database (Neon PostgreSQL)**: Already provisioned and seeded!
  ```
  DATABASE_URL="postgresql://neondb_owner:npg_lZXVUqsjMg93@ep-soft-shadow-aytc5lnq.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
  ```
- **JWT Secret Key**:
  ```
  JWT_SECRET="hustlex_workspace_jwt_secret_key_prod_2025"
  ```

---

## ⚡ Step 1: Deploy Backend on Render (Approx. 3 mins)

### Method A: Using Render Blueprint (Automatic via `render.yaml`)
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **"New +"** → **"Blueprint"**.
3. Connect your GitHub repository: `https://github.com/anupmazumdar/Team-Management`.
4. Render will detect [`render.yaml`](render.yaml) and automatically configure the service.
5. Click **"Apply"**.

---

### Method B: Manual Web Service Setup
If you prefer creating the Web Service manually:
1. Go to **Render Dashboard** → **"New +"** → **"Web Service"**.
2. Select **`anupmazumdar/Team-Management`**.
3. Set the following fields:
   - **Name**: `hustlex-backend` (or your preferred name)
   - **Region**: Oregon or Ohio (closest to Neon `us-east-2`)
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run start
     ```
   - **Instance Type**: `Free`

4. Add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `postgresql://neondb_owner:npg_g0hZqM3AomwW@ep-soft-shadow-aytc5lnq.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require` |
   | `JWT_SECRET` | `hustlex_workspace_jwt_secret_key_prod_2025` |
   | `CORS_ORIGIN` | `*` |
   | `UPLOAD_DIR` | `./uploads` |

5. Click **"Create Web Service"**.
6. Once deployed, copy your Render URL (for example: `https://hustlex-backend.onrender.com`).
   - Verify it by visiting: `https://hustlex-backend.onrender.com/api/health`
   - Expected response: `{"status":"ok","app":"Hustlex Team Workspace API"}`

---

## ⚡ Step 2: Deploy Frontend on Vercel (Approx. 2 mins)

1. Log in to [vercel.com](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Import the repository **`anupmazumdar/Team-Management`**.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and select **`client`**
5. Expand **Environment Variables** and add:

   | Key | Value | Note |
   |---|---|---|
   | `VITE_API_URL` | `https://your-render-app.onrender.com/api` | Replace with your live Render backend URL + `/api` |
   | `VITE_WS_URL` | `https://your-render-app.onrender.com` | Replace with your live Render backend URL |

6. Click **"Deploy"**.
7. Vercel will build and deploy your frontend in ~30 seconds and provide your live URL (e.g. `https://team-management-xxx.vercel.app`).

---

## 🎯 Step 3: Verify All Features Live

Once both are deployed, open your Vercel URL and test:
1. **Authentication**:
   - Log in using the Quick Demo accounts (e.g. `alex.founder@hustlex.com` or `maya.lead@hustlex.com`, password `Password123!`).
2. **Mission Assignment**:
   - Click **"+ Create Task"**. Fill in title, description, and the **"Mission Details & On-Time Deliverable Briefing"** textarea.
   - Assign to a team member with a deadline.
3. **Accepting Tasks**:
   - Log in as the assigned member, navigate to the task, and click **"🎯 Accept Mission & Start Work"**.
   - Note the status changes to `IN_PROGRESS` with an audit stamp.
4. **Delivering On-Time**:
   - Click **"Deliver / Submit for Review"** with your submission note.
   - Observe the **"🚀 Delivered On-Time (Within SLA)"** badge!
5. **Team Governance & SLA Scorecard**:
   - Navigate to the **"Team"** page to see the real-time **On-Time SLA %** and approval ratings for all members.
6. **Real-Time Collaboration**:
   - Open **Chat** to experience persistent real-time Socket.IO communication powered by Render.
