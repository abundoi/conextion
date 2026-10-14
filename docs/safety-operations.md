# Trust, Safety & Operational Moderation Manual
## Enterprise Dating & Relationship Platform (Conextion)

---

### 1. Operational Principles & Legal Boundaries

Conextion maintains zero tolerance for minors (<18), harassment, non-consensual sexual content, hate speech, financial scams, and violence.

To protect member dignity, privacy, and constitutional due process:
1. **Human Decision-Making for Consequential Actions**: Automated heuristics, perceptual hashing, and AI flags serve as triage mechanisms only. Account bans and content removals require human moderator verification.
2. **Least Privilege Data Access**: Staff members (moderators, support agents) are strictly prohibited from reading unflagged private member messages or inspecting identity documents unless a message or document has been formally reported with cryptographic consent.
3. **Audit Trail Immutability**: Every moderation decision, case note, assignment, and status transition is recorded in `audit_logs` and cannot be deleted or altered.

---

### 2. Incident Triage & Priority Matrix

| Category | Priority | SLA Response Target | Initial Automated Safeguard | Required Human Reviewer |
| :--- | :---: | :---: | :--- | :--- |
| **Underage Suspicion (<18)** | `critical` | $<15$ minutes | Profile discovery paused immediately; account locked pending age verification | Safety Admin / Super Admin |
| **Physical Safety Threat / Extortion** | `critical` | $<15$ minutes | Messaging suspended; emergency escalation trigger | Safety Admin / Super Admin |
| **Non-Consensual Imagery / Explicit Media** | `high` | $<1$ hour | Photo removed from public feed immediately | Moderator / Safety Admin |
| **Harassment / Hate Speech** | `medium` | $<4$ hours | Bidirectional block applied between reporter and reported | Moderator |
| **Commercial Spam / Financial Scam** | `medium` | $<4$ hours | Message frequency rate limited | Moderator |
| **Impersonation / Fake Profile** | `low` | $<12$ hours | Queued for photo liveness re-verification | Support Agent / Moderator |

---

### 3. Step-by-Step Enforcement Procedures

#### 3.1 Procedure: Underage Suspicion Triage
1. When a report with category `underage_suspicion` is filed:
   - System automatically pauses the reported user's discovery visibility (`isVisible = false`).
   - Case is assigned to the `safety_admin` queue with `priority = critical`.
2. Safety Officer reviews birthdate attestation, IP history, and profile prompts.
3. If confirmed or unverified:
   - Account status transitioned to `banned` or `suspended`.
   - All active matches are terminated and photos purged from delivery caches.
   - Device and IP hash recorded in fraud prevention log.
4. An immutable audit record is committed to `audit_logs`.

#### 3.2 Procedure: Media & Content Moderation
1. Photos uploaded by members enter storage in state `pending_review`.
2. Automated Vision API checks for adult content, nudity, violence, and perceptual hashes.
3. If flagged:
   - Photo is presented in the Moderator Portal (`/admin/moderation/photos`).
   - Moderator clicks `Approve`, `Reject`, or `Flag for Safety Admin`.
   - On rejection: photo status updated to `rejected`, reason stored, and user notified with guidance on community photo standards.

#### 3.3 Procedure: Enforcement Actions Escalation
1. **Tier 1 (Warning)**: Content warning issued; objectionable photo/prompt removed.
2. **Tier 2 (Temporary Suspension)**: Account locked for 7–30 days; messaging and discovery revoked.
3. **Tier 3 (Permanent Ban)**: Account permanently terminated; active sessions revoked via Firebase Admin `revokeRefreshTokens`.

---

### 4. Appeals Workflow

Members subjected to enforcement actions retain the right to appeal:
1. **Submission**: User submits an appeal via the Appeals Form (`/support/appeal`) specifying the case reference and counter-evidence.
2. **Independent Review**: Appeals must be reviewed by a different staff member than the one who rendered the original decision.
3. **Outcome**:
   - `approved`: Account restored to `active`, discovery unpaused, notification dispatched.
   - `rejected`: Decision finalized; written justification stored in case notes.

---

### 5. Privacy, Data Access & Deletion Protocol (GDPR & CCPA)

#### 5.1 Right of Access / Data Export (GDPR Art. 15)
- User requests full data export at `/settings/privacy`.
- System creates a `privacy_data_requests` record with `type = 'export'`.
- Background worker compiles a machine-readable JSON package containing user profile, preferences, consent logs, match history, and photos metadata.
- Export package is encrypted and made available for secure download via short-lived signed URL (expires in 48 hours).

#### 5.2 Right to Erasure / Account Deletion (GDPR Art. 17)
- User requests account deletion at `/settings/privacy`.
- Immediate action: Profile hidden from discovery, all active sessions revoked.
- 30-day grace period initiated to prevent fraudulent re-registration or evade active safety investigations.
- At day 30: Automated purge cascades across `users`, `user_profiles`, `profile_photos`, `interactions`, and `matches`.
- Immutable audit entries are retained in anonymized format (`actor_id = NULL`) strictly for legal compliance.
