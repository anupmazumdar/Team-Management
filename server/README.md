# Hustlex Team Workspace — Backend Server API

REST API and real-time Socket.IO WebSocket server for the Hustlex Team Workspace, built with Node.js, Express, TypeScript, and Prisma ORM with Neon PostgreSQL.

---

> [!CAUTION]
> ### ⚠️ CRITICAL SECURITY NOTICE: ROTATE EXPOSED CREDENTIALS
> If a live Neon PostgreSQL database connection string or JWT secret was ever previously committed to this repository or made publicly viewable:
> 1. **Rotate your Neon Database Password immediately**:
>    - Go to [console.neon.tech](https://console.neon.tech).
>    - Select your project → **Roles** or **Project Settings**.
>    - Reset the password for your database user role to instantly invalidate the old password.
> 2. **Generate a new `JWT_SECRET`**:
>    - Generate a fresh cryptographically random 32+ character string (e.g. `openssl rand -hex 32`).
> 3. **Update Live Production Environments**:
>    - In Render Dashboard → Your Web Service → **Environment Variables**, update `DATABASE_URL` and `JWT_SECRET`.
> 4. **Local Development**:
>    - Update your local `server/.env` file. Never commit `.env` files to git.

---

## Environment Variables Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure `server/.env` with safe placeholder values:
```ini
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://<DB_USER>:<DB_PASSWORD>@<EP_HOSTNAME>.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="<REPLACE_WITH_YOUR_NEW_32_CHAR_RANDOM_SECRET_KEY>"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
UPLOAD_DIR="./uploads"
CORS_ORIGIN="http://localhost:5173"
```

---

## Local Development & Setup

```bash
# 1. Install dependencies
npm install

# 2. Push schema to database
npx prisma db push

# 3. Seed demo accounts, teams, and milestones
npm run prisma:seed

# 4. Run State Machine verification tests
npm run test:state-machine

# 5. Start development server
npm run dev

# 6. Build for production
npm run build

# 7. Start production build
npm run start
```
