# 🚀 Deployment Guide: Frontend on Vercel & Backend on Render

This guide walks you through deploying **Hustlex Team Workspace** with:
- **Backend API & WebSockets** on **Render** (Node.js Web Service)
- **Frontend SPA** on **Vercel** (Global Edge CDN)
- **Database** on **Neon PostgreSQL** (Cloud Serverless Database)

---

## 🏗️ Architecture & Configuration Requirements

- **GitHub Repository**: [https://github.com/anupmazumdar/Team-Management](https://github.com/anupmazumdar/Team-Management)
- **Database (PostgreSQL)**: Neon Serverless PostgreSQL, Supabase, or self-hosted
  ```
  DATABASE_URL=
  ```
- **JWT Secret Key**: Random 32+ character string for token signing (Never commit secrets)
  ```
  JWT_SECRET=
  ```

---

## ⚡ Step 1: Deploy Backend on Render (Approx. 3 mins)

### Method A: Using Render Blueprint (Automatic via `render.yaml`)
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **"New +"** → **"Blueprint"**.
3. Connect your GitHub repository: `https://github.com/anupmazumdar/Team-Management`.
4. Render will detect [`render.yaml`](render.yaml) and automatically configure the service.
5. Render will prompt you to enter `DATABASE_URL`. Paste your Neon connection string.
6. Click **"Apply"**.

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
     npm install --include=dev && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run start
     ```
   - **Instance Type**: `Free`

4. Add **Environment Variables**:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `DATABASE_URL` | `<Your live Neon DB connection string>` | Secure connection string from Neon dashboard |
   | `JWT_SECRET` | `<Your random 32+ character string>` | Strong cryptographic signing secret |
   | `CLIENT_URL` | `https://your-frontend.vercel.app` | Allowed client URL |
   | `CORS_ORIGIN` | `https://your-frontend.vercel.app` | Allowed CORS origin |
   | `UPLOAD_DIR` | `./uploads` | Local upload directory fallback |

5. Click **"Create Web Service"**.
6. Once deployed, copy your Render URL (for example: `https://hustlex-backend.onrender.com`).
   - Verify it by visiting: `https://hustlex-backend.onrender.com/api/health`
   - Expected response: `{"status":"ok","app":"Hustlex Team Workspace API"}`

---

> [!WARNING]
> ### 🛑 DEPLOYMENT ARCHITECTURE RULES (AVOID MIX-UPS)
> **Do not create a Vercel project for the backend — it must run on Render per `render.yaml`. Only the `client/` folder should ever be deployed to Vercel.**
>
> The backend requires a long-running Node.js process with persistent Socket.IO WebSockets and direct Prisma database access, which Render handles natively. Vercel is strictly for the static compiled React frontend.
>
> **If you accidentally created a Vercel project named like the backend (e.g., `team-management-server`):**
> 1. In your Vercel Dashboard, delete the project if you already have a separate client project.
> 2. Or, if this is your primary Vercel project, configure it to correctly point to the frontend:
>    - Go to **Vercel Dashboard** → Select Project → **Settings** → **General**.
>    - Scroll to **Root Directory**:
>      - Leave as `./` (repository root) if relying on the root [`vercel.json`](vercel.json) (`npm run build --prefix client` and `client/dist`).
>      - Or click **Edit** and set Root Directory to `client` if you prefer building isolated inside the client subfolder.
>    - Under **Build & Development Settings**:
>      - If Root Directory is `./`: Build Command = `npm run build --prefix client`, Output Directory = `client/dist`.
>      - If Root Directory is `client`: Build Command = `npm run build`, Output Directory = `dist`.
>    - Save and click **Redeploy**.

---

## ⚡ Step 2: Deploy Frontend on Vercel (Approx. 2 mins)

1. Log in to [vercel.com](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Import the repository **`anupmazumdar/Team-Management`**.
4. In the **Configure Project** screen:
   - **Root Directory**: `./` (Leave as default repository root — do **NOT** change to `client/`). The single root `vercel.json` serves as the source of truth, building via `npm run build --prefix client` and deploying `client/dist`.
   - **Framework Preset**: `Vite` (or `Other`)
   - **Build Command**: Automatically provided by root `vercel.json` (`npm run build --prefix client`)
   - **Output Directory**: Automatically provided by root `vercel.json` (`client/dist`)
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
   - Log in using the Admin account (`admin@hustlex.com`, password `Password123!`), click **"Continue with Auth0 SSO"**, or sign in using the **Google / GitHub / LinkedIn** authenticators.
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
