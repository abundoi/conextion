-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('member', 'moderator', 'support_agent', 'finance_admin', 'safety_admin', 'super_admin');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('pending_verification', 'active', 'suspended', 'deactivated', 'banned');

-- CreateEnum
CREATE TYPE "RelationshipIntent" AS ENUM ('dating', 'long_term', 'casual', 'friendship', 'open_to_options');

-- CreateEnum
CREATE TYPE "EligibilityCheckType" AS ENUM ('age_gate_self_attest', 'id_document_scan', 'facial_age_estimation', 'third_party_kyc');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('selfie_liveness', 'government_id', 'phone_otp', 'background_check');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'flagged');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('terms_of_service', 'privacy_policy', 'age_certification_18plus', 'community_guidelines', 'cookies_analytics');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "account_status" "AccountStatus" NOT NULL DEFAULT 'pending_verification',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "computed_age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "bio" TEXT,
    "location_city" TEXT,
    "location_country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "relationship_intent" "RelationshipIntent" NOT NULL DEFAULT 'dating',
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "min_age_preference" INTEGER NOT NULL DEFAULT 18,
    "max_age_preference" INTEGER NOT NULL DEFAULT 99,
    "max_distance_km" INTEGER NOT NULL DEFAULT 50,
    "interested_in_genders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relationship_intent_filter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_checks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "check_type" "EligibilityCheckType" NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'pending',
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "verified_age" INTEGER,
    "provider_reference" TEXT,
    "check_metadata" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "verification_type" "VerificationType" NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'pending',
    "reviewer_notes" TEXT,
    "reviewer_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_photos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'pending_review',
    "moderation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interests" (
    "user_id" TEXT NOT NULL,
    "interest_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("user_id","interest_id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "consent_version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "agreement_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_entity" TEXT NOT NULL,
    "target_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "users_firebase_uid_idx" ON "users"("firebase_uid");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_account_status_idx" ON "users"("account_status");

CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles"("user_id");
CREATE INDEX "user_profiles_computed_age_idx" ON "user_profiles"("computed_age");
CREATE INDEX "user_profiles_gender_idx" ON "user_profiles"("gender");
CREATE INDEX "user_profiles_relationship_intent_idx" ON "user_profiles"("relationship_intent");
CREATE INDEX "user_profiles_is_visible_idx" ON "user_profiles"("is_visible");

CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");
CREATE INDEX "user_preferences_user_id_idx" ON "user_preferences"("user_id");

CREATE INDEX "eligibility_checks_user_id_idx" ON "eligibility_checks"("user_id");
CREATE INDEX "eligibility_checks_check_type_idx" ON "eligibility_checks"("check_type");
CREATE INDEX "eligibility_checks_status_idx" ON "eligibility_checks"("status");

CREATE INDEX "verification_records_user_id_idx" ON "verification_records"("user_id");
CREATE INDEX "verification_records_verification_type_idx" ON "verification_records"("verification_type");
CREATE INDEX "verification_records_status_idx" ON "verification_records"("status");

CREATE INDEX "profile_photos_user_id_idx" ON "profile_photos"("user_id");
CREATE INDEX "profile_photos_is_primary_idx" ON "profile_photos"("is_primary");
CREATE INDEX "profile_photos_moderation_status_idx" ON "profile_photos"("moderation_status");

CREATE UNIQUE INDEX "interests_slug_key" ON "interests"("slug");
CREATE UNIQUE INDEX "interests_name_key" ON "interests"("name");
CREATE INDEX "interests_category_idx" ON "interests"("category");

CREATE INDEX "user_interests_user_id_idx" ON "user_interests"("user_id");
CREATE INDEX "user_interests_interest_id_idx" ON "user_interests"("interest_id");

CREATE INDEX "consent_records_user_id_idx" ON "consent_records"("user_id");
CREATE INDEX "consent_records_consent_type_idx" ON "consent_records"("consent_type");

CREATE INDEX "blocks_blocker_id_idx" ON "blocks"("blocker_id");
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_target_entity_idx" ON "audit_logs"("target_entity");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- Foreign Keys
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_records" ADD CONSTRAINT "verification_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_records" ADD CONSTRAINT "verification_records_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
