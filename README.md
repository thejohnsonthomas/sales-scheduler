# Sales Meeting Scheduler

Production-ready automated sales meeting scheduling system with Demo Capacity Forecasting. Automatically schedules meetings between Account Executives, Customers, and Solution Engineers with calendar conflict detection, load balancing, and capacity forecasting.

## Features

- **Authentication**: Google OAuth with role-based access (Admin, Solution Engineer, Account Executive)
- **Scheduling Engine**: Finds available slots with 10-min buffer, load balancing, round-robin
- **Google Calendar**: Read availability, create events, invite participants
- **Segments**: 1-2 MSP, 3-5 MSP, IT, MidMarket
- **Regions**: North America, South America, Europe, Australia, MENA
- **Capacity Forecasting**: SE utilization, demand prediction, capacity risk alerts
- **Admin Dashboard**: User management, role assignment, segment/region assignment
- **Reporting**: Meetings per SE, segment, region with distribution analytics

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Google Cloud project with OAuth and Calendar API enabled

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your DATABASE_URL, NEXTAUTH_*, GOOGLE_* values

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed segments and regions
npx prisma db seed

# Start development server
npm run dev
```

Visit http://localhost:3000 and sign in with Google.

### First Admin

After first sign-in, promote yourself to Admin:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

Then assign segments, regions, and roles to users via the Admin panel.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full Docker setup, environment variables, Google API configuration, and production deployment instructions.

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, Prisma
- **Database**: PostgreSQL
- **Auth**: NextAuth.js with Google OAuth
- **Calendar**: Google Calendar API
