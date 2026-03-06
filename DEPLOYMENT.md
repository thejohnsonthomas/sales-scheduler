# Sales Meeting Scheduler - Deployment Instructions

This document provides complete instructions for deploying the Sales Meeting Scheduler to production infrastructure.

---

## Free Tier Stack (Vercel + Neon + Render + Resend + Google)

| Layer        | Service   | Plan / Notes                          |
|-------------|-----------|----------------------------------------|
| **Frontend**| Vercel    | Free forever                           |
| **Backend** | Render    | Free web service (or use Vercel APIs)  |
| **Database**| Neon      | Free PostgreSQL, 0.5GB, no pause      |
| **Email**   | Resend    | 3,000/month free (optional)           |
| **Auth + Calendar** | Google OAuth | Free                    |

### Option A: All-in-one on Vercel (simplest)

Next.js runs both the UI and API routes on Vercel. No separate backend host.

1. **Neon (database)**  
   - Sign up: [neon.tech](https://neon.tech)  
   - Create a project → copy the **connection string** (e.g. `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).

2. **Vercel (app + backend)**  
   - Push your repo to GitHub.  
   - [vercel.com](https://vercel.com) → New Project → import repo.  
   - In **Settings → Environment Variables** add:

   | Name               | Value                    |
   |--------------------|--------------------------|
   | `DATABASE_URL`     | Neon connection string   |
   | `NEXTAUTH_URL`     | `https://your-app.vercel.app` |
   | `NEXTAUTH_SECRET`  | `openssl rand -base64 32` |
   | `GOOGLE_CLIENT_ID`| From Google Cloud        |
   | `GOOGLE_CLIENT_SECRET` | From Google Cloud   |

   - Deploy. Your app and APIs run at `https://your-app.vercel.app`.

3. **Google OAuth**  
   - In [Google Cloud Console](https://console.cloud.google.com/) → Credentials → your OAuth client:  
   - **Authorized JavaScript origins**: `https://your-app.vercel.app`  
   - **Authorized redirect URIs**: `https://your-app.vercel.app/api/auth/callback/google`

4. **Resend (optional, for email later)**  
   - Sign up at [resend.com](https://resend.com).  
   - Add `RESEND_API_KEY` to Vercel env when you implement email (e.g. meeting confirmations).

### Option B: Backend on Render, frontend on Vercel

Use Render only if you want the same Next.js app (including API routes) running on a long-lived server instead of serverless.

1. **Neon** – Same as above; get `DATABASE_URL`.
2. **Render**  
   - New → Web Service → connect repo.  
   - Build: `npm install && npx prisma generate && npm run build`  
   - Start: `npm run start` (or `npx prisma migrate deploy && npm run start`).  
   - Add the same env vars as in Option A, with `NEXTAUTH_URL` = your Render URL (e.g. `https://your-app.onrender.com`).
3. **Google OAuth** – Use the Render URL in origins and redirect URIs.
4. **(Optional)** Frontend on Vercel pointing to Render API: set `NEXT_PUBLIC_API_URL` to the Render URL if you split later. For the current single Next.js app, running the whole app on either Vercel or Render is enough.

### First admin after deploy

Connect to Neon (e.g. with psql or Neon’s SQL editor) and run:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

Then run migrations if not already in build/start:

```bash
npx prisma migrate deploy
npx prisma db seed
```

---

## Prerequisites

- Docker and Docker Compose (or Kubernetes)
- PostgreSQL 14+ (or use the included Docker Compose)
- Google Cloud Console account (for OAuth and Calendar API)
- Domain name and SSL certificate (for production)

---

## 1. Environment Variables

Create a `.env` file (never commit this to version control):

```env
# Database - Required
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/sales_scheduler"

# NextAuth - Required
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-a-32-char-random-string"

# Google OAuth - Required
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## 2. Google API Configuration

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google Calendar API**:
   - Navigate to APIs & Services → Library
   - Search for "Google Calendar API"
   - Click Enable

### Step 2: Configure OAuth Consent Screen

1. Go to APIs & Services → OAuth consent screen
2. Choose "External" (or "Internal" for workspace-only)
3. Fill in App name, User support email, Developer contact
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users if in testing mode

### Step 3: Create OAuth Credentials

1. Go to APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: **Web application**
4. Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to your `.env`

---

## 3. Database Setup

### Option A: Using Docker Compose (Recommended for single-server)

```bash
# Start PostgreSQL only (for initial setup)
docker-compose up -d db

# Wait for DB to be healthy, then run migrations
npx prisma migrate deploy
npx prisma db seed
```

### Option B: External PostgreSQL (e.g., AWS RDS, Supabase)

1. Create a PostgreSQL 14+ database
2. Set `DATABASE_URL` in your environment
3. Run migrations:

```bash
npx prisma migrate deploy
npx prisma db seed
```

### Database Migrations

```bash
# Generate migration (development)
npx prisma migrate dev --name init

# Apply migrations (production)
npx prisma migrate deploy

# Seed segments and regions
npx prisma db seed
```

---

## 4. Docker Setup

### Build and Run with Docker Compose

```bash
# Build the image
docker-compose build

# Start database first
docker-compose up -d db

# Wait for DB to be ready, then run migrations
docker-compose run --rm app npx prisma migrate deploy
docker-compose run --rm app npx prisma db seed

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

Note: The app container needs `prisma` CLI for migrations. If your image doesn't include it, run migrations from your host with `DATABASE_URL` pointing to the database.

### Build Docker Image Manually

```bash
docker build -t sales-scheduler:latest .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_URL="https://..." \
  -e NEXTAUTH_SECRET="..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  sales-scheduler:latest
```

### Docker Compose with External DB

Edit `docker-compose.yml` to remove the `db` service and set `DATABASE_URL` to your external database connection string.

---

## 5. Production Deployment Options

### Option A: Single VPS (DigitalOcean, Linode, etc.)

1. Install Docker on the server
2. Clone the repository
3. Create `.env` with production values
4. Run `docker-compose up -d`
5. Configure Nginx as reverse proxy with SSL (Let's Encrypt)
6. Set up a process manager (e.g., systemd) to restart on failure

### Option B: Kubernetes

1. Build and push image to container registry
2. Create Kubernetes manifests:
   - Deployment
   - Service
   - ConfigMap/Secret for env vars
   - Ingress with TLS
3. Use external PostgreSQL (RDS, Cloud SQL, etc.)

### Option C: Vercel + External DB

1. Deploy to Vercel: `vercel deploy --prod`
2. Set environment variables in Vercel dashboard
3. Use Vercel Postgres, Supabase, or Neon for database
4. Update `NEXTAUTH_URL` to your Vercel domain

### Option D: AWS (ECS/EKS)

1. Push image to ECR
2. Create ECS task definition with env vars
3. Create RDS PostgreSQL instance
4. Configure ALB with SSL
5. Deploy ECS service

---

## 6. Post-Deployment Checklist

- [ ] First user signs in via Google OAuth
- [ ] Manually promote first user to Admin in database:
  ```sql
  UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@company.com';
  ```
- [ ] Admin assigns segments and regions to users
- [ ] Admin assigns SEs to segments and regions
- [ ] Admin configures capacity limits for SEs
- [ ] Test scheduling a meeting end-to-end
- [ ] Verify Google Calendar events are created

---

## 7. Health Checks

The application exposes standard HTTP endpoints. Configure your load balancer to health check:

- `GET /` - Returns 200 when app is running (redirects to signin if unauthenticated)

---

## 8. Backup and Maintenance

### Database Backups

```bash
# PostgreSQL backup
pg_dump -h HOST -U USER sales_scheduler > backup.sql

# Restore
psql -h HOST -U USER sales_scheduler < backup.sql
```

### Logs

- Application logs: `docker-compose logs -f app`
- Database logs: Check PostgreSQL logs in your hosting provider

---

## 9. Troubleshooting

### "Google Calendar not connected"
- User must sign in with Google and grant calendar permissions
- Ensure OAuth scopes include `calendar` and `calendar.events`
- Re-authenticate to refresh the refresh token

### "No Solution Engineers available"
- Admin must assign SEs to segments and regions
- SE must have `userSegments` and `userRegions` populated

### Database connection errors
- Verify `DATABASE_URL` format: `postgresql://user:pass@host:5432/dbname`
- Ensure database is accessible from app (firewall, security groups)
- Run `npx prisma migrate deploy` to ensure schema is up to date

### NEXTAUTH_URL mismatch
- Must match exactly the URL users access (including https)
- No trailing slash
