import { prisma } from "../db/prisma";
import { RelationshipIntent } from "@prisma/client";
import { verifyAgeEligibility } from "../auth/age-assurance";
import { logger } from "../logging/logger";

export interface ProfileInput {
  displayName: string;
  birthdate: string | Date;
  gender: string;
  bio?: string;
  locationCity?: string;
  locationCountry?: string;
  latitude?: number;
  longitude?: number;
  relationshipIntent: RelationshipIntent;
}

export interface PreferencesInput {
  minAgePreference?: number;
  maxAgePreference?: number;
  maxDistanceKm?: number;
  interestedInGenders?: string[];
  relationshipIntentFilter?: string[];
}

export interface PromptInput {
  promptText: string;
  answer: string;
  order?: number;
}

const DEFAULT_INTERESTS = [
  { slug: "travel", name: "Travel & Exploration", category: "Lifestyle" },
  { slug: "fitness", name: "Fitness & Wellness", category: "Health" },
  { slug: "culinary", name: "Cooking & Dining", category: "Food" },
  { slug: "music", name: "Live Music & Concerts", category: "Arts" },
  { slug: "cinema", name: "Film & Cinema", category: "Entertainment" },
  { slug: "tech", name: "Technology & Design", category: "Career" },
  { slug: "literature", name: "Reading & Writing", category: "Arts" },
  { slug: "outdoors", name: "Hiking & Outdoors", category: "Activity" },
  { slug: "art", name: "Museums & Galleries", category: "Culture" },
  { slug: "gaming", name: "Board & Video Games", category: "Entertainment" },
  { slug: "coffee", name: "Coffee & Cafes", category: "Food" },
  { slug: "entrepreneurship", name: "Startups & Growth", category: "Career" },
];

export async function getOrSeedInterests() {
  const existing = await prisma.interest.findMany();
  if (existing.length > 0) return existing;

  for (const item of DEFAULT_INTERESTS) {
    await prisma.interest.upsert({
      where: { slug: item.slug },
      update: {},
      create: item,
    });
  }

  return await prisma.interest.findMany();
}

/**
 * Creates or updates member profile with strict 18+ verification.
 */
export async function saveProfile(userId: string, input: ProfileInput) {
  const ageCheck = verifyAgeEligibility(input.birthdate);
  if (!ageCheck.isEligible) {
    throw new Error(ageCheck.reason || "Eligibility check failed: Member must be 18+.");
  }

  const birthdate =
    typeof input.birthdate === "string" ? new Date(input.birthdate) : input.birthdate;

  return await prisma.userProfile.upsert({
    where: { userId },
    update: {
      displayName: input.displayName,
      birthdate,
      computedAge: ageCheck.computedAge,
      gender: input.gender,
      bio: input.bio,
      locationCity: input.locationCity,
      locationCountry: input.locationCountry,
      latitude: input.latitude,
      longitude: input.longitude,
      relationshipIntent: input.relationshipIntent,
    },
    create: {
      userId,
      displayName: input.displayName,
      birthdate,
      computedAge: ageCheck.computedAge,
      gender: input.gender,
      bio: input.bio,
      locationCity: input.locationCity,
      locationCountry: input.locationCountry,
      latitude: input.latitude,
      longitude: input.longitude,
      relationshipIntent: input.relationshipIntent,
    },
  });
}

/**
 * Updates member discovery preferences.
 */
export async function savePreferences(userId: string, input: PreferencesInput) {
  return await prisma.userPreference.upsert({
    where: { userId },
    update: {
      minAgePreference: input.minAgePreference,
      maxAgePreference: input.maxAgePreference,
      maxDistanceKm: input.maxDistanceKm,
      interestedInGenders: input.interestedInGenders,
      relationshipIntentFilter: input.relationshipIntentFilter,
    },
    create: {
      userId,
      minAgePreference: input.minAgePreference ?? 18,
      maxAgePreference: input.maxAgePreference ?? 99,
      maxDistanceKm: input.maxDistanceKm ?? 50,
      interestedInGenders: input.interestedInGenders ?? [],
      relationshipIntentFilter: input.relationshipIntentFilter ?? [],
    },
  });
}

/**
 * Replaces selected interests for a member.
 */
export async function saveInterests(userId: string, interestSlugs: string[]) {
  const matchedInterests = await prisma.interest.findMany({
    where: { slug: { in: interestSlugs } },
  });

  await prisma.$transaction(async (tx) => {
    // Clear existing
    await tx.userInterest.deleteMany({ where: { userId } });

    // Link new
    for (const interest of matchedInterests) {
      await tx.userInterest.create({
        data: {
          userId,
          interestId: interest.id,
        },
      });
    }
  });

  return matchedInterests;
}

/**
 * Replaces profile prompts.
 */
export async function savePrompts(userId: string, prompts: PromptInput[]) {
  await prisma.$transaction(async (tx) => {
    await tx.userPrompt.deleteMany({ where: { userId } });

    for (let i = 0; i < prompts.length; i++) {
      const p = prompts[i];
      if (p.promptText.trim() && p.answer.trim()) {
        await tx.userPrompt.create({
          data: {
            userId,
            promptText: p.promptText.trim(),
            answer: p.answer.trim(),
            order: p.order ?? i,
          },
        });
      }
    }
  });
}

/**
 * Toggles profile visibility (Pause/Resume discovery).
 */
export async function setDiscoveryVisibility(userId: string, isVisible: boolean) {
  return await prisma.userProfile.update({
    where: { userId },
    data: { isVisible },
  });
}

/**
 * Finalizes onboarding and publishes the profile.
 */
export async function publishProfile(userId: string) {
  // Check required profile conditions
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile || !profile.displayName || !profile.gender) {
    throw new Error("Cannot publish: Incomplete profile information.");
  }

  // Update profile status and user account status
  await prisma.$transaction([
    prisma.userProfile.update({
      where: { userId },
      data: { isProfileComplete: true, isVisible: true },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "active" },
    }),
  ]);

  logger.info("Member profile published and activated", { userId });
}
