# Integration Register & Dependency Catalog
## Enterprise Dating & Relationship Platform (Conextion)

---

### 1. Integration Inventory & Status Matrix

| Integration Name | Provider / Service | Protocol / Transport | Purpose | Security Tier | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Firebase Auth (Client)** | Google Identity Toolkit | HTTPS / Web SDK | User sign-up, sign-in, MFA, token refresh | Public Client Keys | Pending Config |
| **Firebase Auth (Admin)** | Google Cloud Identity | gRPC / REST Service Account | Server-side token verification, custom claims, session cookies | Secret (Server Only) | Pending Config |
| **Cloud SQL PostgreSQL** | Google Cloud SQL (PostgreSQL 16) | PostgreSQL Wire (SSL / Port 5432 / 6543) | Primary relational database | Secret (Server Only) | Ready for Setup |
| **Google Cloud Storage** | Google Cloud Storage | HTTPS / V4 Signed URLs | Private photo storage, media moderation staging | Secret (Server Only) | Ready for Setup |
| **Vercel Platform** | Vercel Serverless & Edge | HTTPS / CI/CD Git Integration | Production hosting, preview deployments, Edge middleware | Secret / Token | Ready for Setup |
| **Cloud Logging** | Google Cloud Logging / Pino | HTTPS / Structured JSON stdout | Audit logging, error tracking, security alerting | Standard Server | Ready for Setup |
| **Age / IDV Service** | Synthetic / Persona / Veriff API | HTTPS REST / Webhook | 18+ Identity document verification (Phase 2) | Secret (Server Only) | Synthetic for Phase 1 |

---

### 2. Environment Variables & Secret Classification

> [!CAUTION]
> Never commit `.env` or `.env.local` files containing real production secrets. Use Vercel Environment Variables or Google Cloud Secret Manager.

#### Public Client Variables (`NEXT_PUBLIC_*`)
Exposed to the browser bundle; contains no privileged credentials.

| Variable Name | Required For | Format / Example | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Base routing, CORS | `https://conextion.vercel.app` or `http://localhost:3000` | Canonical platform URL. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Client SDK | `AIzaSy...` | Browser API key for Firebase Auth. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Client SDK | `conextion-prod.firebaseapp.com` | Firebase authentication domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Client SDK | `conextion-prod` | GCP project ID. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Firebase Client SDK | `conextion-prod.appspot.com` | Public storage bucket identifier. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Firebase Client SDK | `1234567890` | Cloud messaging sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Client SDK | `1:1234567890:web:abcdef` | Client app identifier. |

#### Private Server Variables (Secret — Never Exposed to Client)

| Variable Name | Required For | Format / Example | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Prisma / App Runtime | `postgresql://user:pass@pooler.gcp.internal:6543/conextion?pgbouncer=true` | Pooled connection string for serverless functions. |
| `DIRECT_URL` | Prisma Migrations | `postgresql://user:pass@db.gcp.internal:5432/conextion` | Direct unpooled connection string for schema migrations. |
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK | `conextion-prod` | GCP project ID for admin operations. |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK | `firebase-admin@conextion-prod.iam.gserviceaccount.com` | Service account client email. |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK | `"-----BEGIN PRIVATE KEY-----\n..."` | RSA private key for server authentication. |
| `GCS_BUCKET_NAME` | Media Upload Service | `conextion-private-media` | Private Google Cloud Storage bucket name. |
| `SESSION_SECRET` | Session Encryption | 32-byte hex or base64 string | Key for encrypting internal session payloads if needed. |

---

### 3. Local Development & Fallback Strategy

To enable full-stack development and testing even before external production cloud credentials are provisioned by the user:

1. **Database Fallback**:
   - Local PostgreSQL container via Docker, or lightweight local SQLite/PostgreSQL development instance configured in Prisma.
   - For Phase 1 validation, a local PostgreSQL or Prisma-compatible environment allows 100% of schema migrations, type-generation, unit tests, and relational constraint tests to run cleanly.
2. **Firebase Auth Fallback**:
   - Firebase Auth Emulator (`firebase-tools emulators:start --only auth`), or an enterprise mock auth provider during unit/integration tests that issues valid signed JWTs and session cookies.
3. **Media Storage Fallback**:
   - Local filesystem or signed URL simulator that validates MIME types and file sizes and issues local test URLs for development.
