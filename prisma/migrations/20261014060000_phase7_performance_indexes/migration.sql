-- Phase 7: Production Performance Composite Indexes
-- High-throughput query optimization for discovery, chat pagination, daily quota checks, and moderation/support SLA queues

-- CreateIndex: UserProfiles discovery feed composite filter
CREATE INDEX IF NOT EXISTS "user_profiles_is_visible_computed_age_gender_idx" ON "user_profiles"("is_visible", "computed_age", "gender");

-- CreateIndex: Interactions daily quota range scan
CREATE INDEX IF NOT EXISTS "interactions_actor_id_created_at_idx" ON "interactions"("actor_id", "created_at");

-- CreateIndex: Messages conversation history pagination
CREATE INDEX IF NOT EXISTS "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex: ModerationCases SLA priority queue
CREATE INDEX IF NOT EXISTS "moderation_cases_status_priority_created_at_idx" ON "moderation_cases"("status", "priority", "created_at");

-- CreateIndex: SupportTickets queue triage
CREATE INDEX IF NOT EXISTS "support_tickets_status_priority_created_at_idx" ON "support_tickets"("status", "priority", "created_at");
