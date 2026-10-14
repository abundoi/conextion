# Incident Response, Disaster Recovery & Operational Runbook

**Conextion — Enterprise Adults-Only (18+) Dating & Relationship Platform**  
**Version:** 1.0.0 (Production Release)  
**Authoritative Environment:** Google Cloud Platform & Vercel  

---

## 1. Incident Classification & Severity Matrix

| Severity | Definition | Examples | SLA / First Response | Target Resolution | Escalation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P0 — Critical Outage** | Complete service outage, data breach, or catastrophic data loss. | Database unreachable, authentication failure across all users, active data exfiltration. | **15 minutes** | **2 hours** | Incident Commander, Lead Architect, Executive Leadership |
| **P1 — High Severity** | Core functionality severely degraded or major safety vulnerability. | Real-time chat offline, payment webhook processing halted, discovery feed failing. | **30 minutes** | **4 hours** | On-Call Lead, Security Engineer |
| **P2 — Medium Severity** | Non-critical feature failure, partial degradation with workaround. | Profile photo upload latency high, notifications delayed, support ticket export failing. | **2 hours** | **24 hours** | Primary Service Owner |
| **P3 — Low Severity** | Minor UI cosmetic glitch, non-blocking administrative issue. | Alignment issue in dark mode, typo in policy document. | **1 business day** | **Next sprint** | Feature Team |

---

## 2. Incident Response Workflow

```mermaid
flowchart TD
    Detect["1. Detection (Alert / Monitoring / Report)"] --> Triage["2. Triage & Severity Assignment (P0-P3)"]
    Triage --> Mobilize["3. Mobilize Incident Response Team"]
    Mobilize --> Contain["4. Containment & Mitigation (Rollback / Circuit Breaker)"]
    Contain --> Resolve["5. Permanent Remediation & Verification"]
    Resolve --> Review["6. Post-Incident Review (Blameless RCA)"]
```

### Roles & Responsibilities
- **Incident Commander (IC)**: Leads coordination, delegates investigation tasks, oversees public/internal communications.
- **Operations Lead**: Manages infrastructure, database connection pool, Vercel deployments, and Cloud SQL.
- **Security Lead**: Evaluates privilege abuse, data leakage, and potential unauthorized access.
- **Communications Lead**: Posts status updates to status page every 30 minutes during P0/P1 incidents.

---

## 3. Disaster Recovery & Database Backup Restoration Drill

### 3.1 Google Cloud SQL PostgreSQL 16 Backup Architecture
- **Automated Daily Backups**: Enabled at 03:00 UTC with 30-day retention.
- **Continuous Write-Ahead Logging (WAL)**: Point-in-Time-Recovery (PITR) enabled with 7-day log retention.
- **Geographic Redundancy**: Cross-region automated storage backup replication (`us-central1` primary, `us-east1` DR clone).

### 3.2 Verified Point-in-Time-Recovery (PITR) Drill Protocol

Follow this exact step-by-step procedure to restore an authoritative database snapshot or drill into a target verification instance:

```bash
# Step 1: Identify target recovery timestamp (e.g. 5 minutes before corruption incident)
TARGET_TIMESTAMP="2026-10-14T14:30:00Z"
SOURCE_INSTANCE="conextion-prod-pg16"
RECOVERY_INSTANCE="conextion-restore-drill-20261014"

# Step 2: Clone database to recovery instance via GCP Cloud SDK
gcloud sql instances clone $SOURCE_INSTANCE $RECOVERY_INSTANCE \
  --point-in-time=$TARGET_TIMESTAMP \
  --project=$GCP_PROJECT_ID

# Step 3: Verify recovery instance health and data consistency
gcloud sql connect $RECOVERY_INSTANCE --user=postgres --quiet <<EOF
  SELECT count(*) FROM users WHERE deleted_at IS NULL;
  SELECT count(*) FROM matches WHERE status = 'active';
  SELECT count(*) FROM messages;
EOF

# Step 4: Validate application connectivity with cloned instance
export DATABASE_URL="postgresql://conextion_app:PASSWORD@10.x.x.x:6543/conextion?pgbouncer=true"
pnpm test

# Step 5: Clean up drill instance after signoff
gcloud sql instances delete $RECOVERY_INSTANCE --project=$GCP_PROJECT_ID --quiet
```

### 3.3 Recovery Objectives
- **Recovery Time Objective (RTO)**: $\le 60\text{ minutes}$ for full database clone & application pointer redirect.
- **Recovery Point Objective (RPO)**: $\le 5\text{ minutes}$ via continuous WAL log streaming.

---

## 4. Deployment Rollback Procedures

### 4.1 Instant Vercel Edge Rollback
In the event a bad code deploy introduces regressions or runtime exceptions:

1. Open **Vercel Dashboard** > **Conextion Project** > **Deployments**.
2. Locate the last known good deployment (verified at commit `15371fc`).
3. Click the three dots (`...`) and select **Instant Rollback (Promote to Production)**.
4. Traffic is rerouted within **5 seconds** without rebuild overhead.

Alternatively, execute via Vercel CLI:
```bash
# Rollback via CLI
vercel rollback <DEPLOYMENT_ID_OR_URL> --token=$VERCEL_TOKEN
```

### 4.2 Database Migration Rollback Strategy
- All migrations are forward-compatible and additive where possible.
- If a migration must be reverted, deploy a compensating forward migration (e.g., `20261014XXXXXX_revert_feature`) using `pnpm exec prisma migrate deploy`.
- Never execute destructive `DROP TABLE` or `DROP COLUMN` in production without a two-sprint deprecation window and validated cold storage archive.

---

## 5. Security & Observability Runbook

### 5.1 Real-Time Health & Diagnostic Endpoints
- Public Liveness Probe: `GET /api/health`
  - Returns `200 OK` when Cloud SQL latency $\le 500\text{ms}$ and memory is healthy.
  - Returns `503 Service Unavailable` if database connection fails.
- Enterprise System Health: `GET /api/admin/health`
  - Returns connection pool utilization, pending moderation queue count, and server uptime.

### 5.2 Forensic Readiness & Audit Log Preservation
- All administrative role mutations, ban adjudications, and PII exports are permanently recorded in the immutable `audit_logs` table.
- Logs are exported to Google Cloud Storage immutable cold storage (`conextion-audit-archive`) with bucket retention locks set to **7 years** for regulatory compliance (GDPR Art. 30 & ISO 27001).
