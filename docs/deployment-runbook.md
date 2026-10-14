# Conextion Production Deployment & Operations Runbook

## 1. Overview & Cloud Topology

Conextion operates on a secure hybrid cloud infrastructure:
- **Application & Edge Hosting**: Vercel Serverless Platform (Next.js 15 App Router, Edge Middleware, Static CDN).
- **Primary Relational Database**: Google Cloud SQL for PostgreSQL 16 (Private IP / Authorized SSL Connections with PgBouncer connection pooling).
- **Identity & Authentication**: Google Cloud Firebase Authentication (Session cookies, MFA, identity tokens).
- **Media & Asset Storage**: Google Cloud Storage (Private buckets with V4 signed upload and read URLs).
- **Payment & Subscriptions**: Stripe API (Test mode default, webhook cryptographic validation).
- **Monitoring & Audit**: Google Cloud Logging, Structured JSON telemetry, and Health endpoints.

```mermaid
flowchart TD
    subgraph ClientLayer["Client & Endpoints"]
        Browser["User Browser / Mobile PWA"]
    end

    subgraph VercelEdge["Vercel Infrastructure"]
        EdgeDNS["Vercel Edge Network / DNS"]
        Middleware["Next.js Edge Middleware"]
        ServerlessApp["Serverless Function Runtime"]
    end

    subgraph GoogleCloud["Google Cloud Platform"]
        CloudSQL["Google Cloud SQL (PostgreSQL 16)"]
        PgBouncer["Connection Pooler (PgBouncer)"]
        FirebaseAuth["Firebase Authentication"]
        GCS["Google Cloud Storage Bucket"]
        CloudLogging["Cloud Logging / Error Reporting"]
    end

    subgraph PaymentProvider["Payment Gateways"]
        Stripe["Stripe Payments Engine"]
    end

    Browser -->|HTTPS TLS 1.3| EdgeDNS
    EdgeDNS --> Middleware
    Middleware --> ServerlessApp
    ServerlessApp -->|Prisma Pooled (Port 6543)| PgBouncer
    PgBouncer -->|Direct Internal (Port 5432)| CloudSQL
    ServerlessApp -->|Firebase Admin SDK| FirebaseAuth
    ServerlessApp -->|V4 Signed URL Generation| GCS
    Browser -->|Direct Signed Upload / Stream| GCS
    ServerlessApp -->|REST / Signed Webhooks| Stripe
    ServerlessApp -->|Structured JSON Logs| CloudLogging
```

---

## 2. Google Cloud SQL (PostgreSQL 16) Setup & Connectivity

### 2.1 Instance Specifications
- **Database Engine**: PostgreSQL 16.
- **Tier**:
  - Development: `db-f1-micro` or `db-g1-small` (1 vCPU, 1.7 GB RAM).
  - Preview / Staging: `db-custom-2-7680` (2 vCPU, 7.5 GB RAM, SSD storage).
  - Production: `db-custom-4-15360` (4 vCPU, 15 GB RAM, High Availability with automatic failover).
- **Storage**: Minimum 20 GB SSD with automatic storage increase enabled.

### 2.2 Database & User Provisioning (Least Privilege)
```sql
-- 1. Create Dedicated Application Database
CREATE DATABASE conextion_prod WITH ENCODING 'UTF8';

-- 2. Create Application Database User (Non-superuser)
CREATE USER conextion_app WITH PASSWORD 'SECURE_APPLICATION_PASSWORD_HERE';

-- 3. Restrict Public Schema Privileges
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO conextion_app;

-- 4. Grant Table and Sequence Permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO conextion_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO conextion_app;

-- 5. Dedicated Migration User (Used only by CI/CD during Prisma Deploy)
CREATE USER conextion_migrator WITH PASSWORD 'MIGRATION_ADMIN_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE conextion_prod TO conextion_migrator;
GRANT ALL ON SCHEMA public TO conextion_migrator;
```

### 2.3 Network Connectivity & Serverless Connection Pooling
Because serverless functions on Vercel spin up on-demand, opening hundreds of direct database TCP connections can exhaust PostgreSQL's `max_connections` (starvation).

**Connectivity Architecture**:
1. **Connection Pooling Proxy (PgBouncer or Cloud SQL Auth Proxy with Pooler)**:
   - Configured in `transaction` pooling mode.
   - Serverless functions connect via `DATABASE_URL` (Port 6543) with `pgbouncer=true&connection_limit=10`.
2. **Direct Connection for Migrations**:
   - Schema alterations, index creation, and DDL migrations require session-level locks.
   - Migrations connect via `DIRECT_URL` (Port 5432) executed strictly within CI/CD pipelines.
3. **TLS/SSL Encryption**:
   - `sslmode=require` or `sslmode=verify-full` enforced on all database connections.
   - Cloud SQL SSL server certificates (`server-ca.pem`) installed in serverless build environment.

---

## 3. Environment Separation

| Configuration Variable | Development (`.env.local`) | Preview / Staging (Vercel Preview) | Production (Vercel Prod) |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` | `production` |
| `DATABASE_URL` | Local / Dev Cloud SQL instance | `conextion_preview` DB with Pooler | `conextion_prod` DB with High Availability |
| `DIRECT_URL` | Local / Direct Dev Cloud SQL | `conextion_preview` Direct Port 5432 | `conextion_prod` Direct Port 5432 |
| `FIREBASE_PROJECT_ID` | `conextion-dev` | `conextion-staging` | `conextion-prod` |
| `GCS_BUCKET_NAME` | `conextion-dev-media` | `conextion-staging-media` | `conextion-prod-media` |
| `STRIPE_SECRET_KEY` | `sk_test_...` (Sandbox) | `sk_test_...` (Sandbox) | `sk_live_...` (Certified Live) |
| `STRIPE_WEBHOOK_SECRET`| `whsec_...` (Local/CLI) | `whsec_...` (Staging endpoint) | `whsec_...` (Production endpoint) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://preview.conextion.app` | `https://conextion.app` |

> [!CRITICAL]
> **Production Isolation Rule**: Preview deployments MUST NOT share database instances, storage buckets, or payment credentials with production.

---

## 4. Pre-Deployment Engineering Verification Checklist

Before promoting any release to production, verify all quality gates:

1. **Automated Test Execution**:
   ```powershell
   pnpm test
   ```
   *Gate Requirement: 100% of test suites must pass (10/10 test files, 96+ tests).*

2. **TypeScript Compilation Check**:
   ```powershell
   pnpm exec tsc --noEmit
   ```
   *Gate Requirement: Exit code 0 with zero type errors.*

3. **Linting & Code Integrity**:
   ```powershell
   pnpm lint
   ```
   *Gate Requirement: Zero ESLint errors or warnings.*

4. **Production Build Compilation**:
   ```powershell
   pnpm build
   ```
   *Gate Requirement: Clean build of all 48 static and dynamic application routes.*

5. **Prisma Schema Migration Verification**:
   ```powershell
   pnpm exec prisma migrate status
   ```
   *Gate Requirement: All migrations in `prisma/migrations` applied; zero pending drift.*

---

## 5. Deployment Procedure (Step-by-Step)

### Step 1: Database Migration Deployment
In the deployment pipeline (or via secure Cloud Build runner):
```bash
# Execute idempotent migration deployment against DIRECT_URL
pnpm exec prisma migrate deploy
```

### Step 2: Vercel Production Release
```bash
# Deploy production release via Vercel CLI or automated Git hook
vercel --prod --token=$VERCEL_TOKEN
```

### Step 3: Post-Deployment Smoke Tests & Health Check
Immediately probe the live production endpoints:
```bash
# 1. Health & Database connectivity check
curl -f https://conextion.app/api/health

# 2. Verify System Telemetry
curl -f https://conextion.app/api/admin/health

# 3. Verify Stripe Webhook listener responsiveness
curl -X POST https://conextion.app/api/subscriptions/webhook -d "{}" -H "Content-Type: application/json"
```

---

## 6. Rollback & Disaster Recovery Procedures

1. **Immediate Application Rollback**:
   - In Vercel Dashboard &rarr; Project &rarr; Deployments &rarr; Select previous healthy deployment &rarr; Click **"Instant Rollback"** (traffic cutover within &lt; 5 seconds).
2. **Database Point-In-Time Recovery (PITR)**:
   - Google Cloud SQL has automated daily backups and binary log archiving (PITR) enabled.
   - To restore to a healthy state:
     ```bash
     gcloud sql instances clone conextion-prod conextion-prod-restored --point-in-time "2026-10-14T12:00:00Z"
     ```
3. **Database Migration Reversal**:
   - Never run destructive down-migrations in production.
   - For breaking schema errors, roll forward using a compensatory non-destructive migration.
