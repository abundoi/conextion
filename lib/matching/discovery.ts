import { prisma } from "../db/prisma";
import { computeCompatibility, CompatibilityReport } from "./compatibility";
import { logger } from "../logging/logger";

export interface CandidateProfile {
  id: string;
  displayName: string;
  computedAge: number;
  gender: string;
  bio: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  relationshipIntent: string;
  photos: { id: string; publicUrl: string; isPrimary: boolean }[];
  interests: { id: string; name: string; slug: string }[];
  prompts: { id: string; promptText: string; answer: string }[];
  compatibility: CompatibilityReport;
}

export interface DiscoveryFilterOverrides {
  minAge?: number;
  maxAge?: number;
  maxDistanceKm?: number;
  relationshipIntent?: string;
}

export async function getDiscoveryFeed(
  userId: string,
  filterOverrides?: DiscoveryFilterOverrides,
  limit = 20
): Promise<CandidateProfile[]> {
  try {
    // 1. Fetch current user with preferences, profile, and interests
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        preferences: true,
        interests: {
          include: { interest: true },
        },
      },
    });

    if (!currentUser || !currentUser.profile || !currentUser.preferences) {
      throw new Error("User profile or preferences not configured.");
    }

    if (!currentUser.profile.isProfileComplete || !currentUser.profile.isVisible) {
      return []; // Hidden profiles do not receive active discovery cards
    }

    const { profile, preferences } = currentUser;

    const minAge = filterOverrides?.minAge ?? preferences.minAgePreference;
    const maxAge = filterOverrides?.maxAge ?? preferences.maxAgePreference;

    // 2. Fetch all blocked user IDs (bidirectional)
    const blocksInitiated = await prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blocksReceived = await prisma.block.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    });

    const blockedIds = new Set<string>([
      ...blocksInitiated.map((b) => b.blockedId),
      ...blocksReceived.map((b) => b.blockerId),
    ]);

    // 3. Fetch all previously interacted targets (liked or passed)
    const interactions = await prisma.interaction.findMany({
      where: { actorId: userId },
      select: { targetId: true },
    });
    const interactedIds = new Set<string>(interactions.map((i) => i.targetId));

    // Excluded IDs list
    const excludedIds = Array.from(new Set([userId, ...blockedIds, ...interactedIds]));

    // 4. Query candidate user profiles
    const candidates = await prisma.user.findMany({
      where: {
        id: { notIn: excludedIds },
        accountStatus: "active",
        profile: {
          isVisible: true,
          isProfileComplete: true,
          computedAge: {
            gte: minAge,
            lte: maxAge,
          },
          ...(preferences.interestedInGenders.length > 0
            ? { gender: { in: preferences.interestedInGenders } }
            : {}),
          ...(filterOverrides?.relationshipIntent
            ? { relationshipIntent: filterOverrides.relationshipIntent as any }
            : {}),
        },
      },
      include: {
        profile: true,
        preferences: true,
        photos: {
          where: { moderationStatus: "approved" },
          orderBy: { displayOrder: "asc" },
        },
        interests: {
          include: { interest: true },
        },
        prompts: {
          orderBy: { order: "asc" },
        },
      },
      take: limit * 2, // Fetch buffer for compatibility ranking
    });

    const userInterests = currentUser.interests.map((ui) => ({
      id: ui.interest.id,
      name: ui.interest.name,
      slug: ui.interest.slug,
    }));

    const viewerContext = {
      userId,
      minAgePreference: minAge,
      maxAgePreference: maxAge,
      maxDistanceKm: preferences.maxDistanceKm,
      interestedInGenders: preferences.interestedInGenders,
      relationshipIntentFilter: preferences.relationshipIntentFilter,
      interests: userInterests,
      relationshipIntent: profile.relationshipIntent,
      latitude: profile.latitude,
      longitude: profile.longitude,
    };

    // 5. Compute compatibility scores & format safe public profiles
    const scoredCandidates: CandidateProfile[] = candidates.map((cand) => {
      const candInterests = cand.interests.map((ci) => ({
        id: ci.interest.id,
        name: ci.interest.name,
        slug: ci.interest.slug,
      }));

      const compatibility = computeCompatibility(viewerContext, {
        id: cand.id,
        computedAge: cand.profile!.computedAge,
        gender: cand.profile!.gender,
        relationshipIntent: cand.profile!.relationshipIntent,
        locationCity: cand.profile!.locationCity,
        locationCountry: cand.profile!.locationCountry,
        latitude: cand.profile!.latitude,
        longitude: cand.profile!.longitude,
        interests: candInterests,
      });

      return {
        id: cand.id,
        displayName: cand.profile!.displayName,
        computedAge: cand.profile!.computedAge,
        gender: cand.profile!.gender,
        bio: cand.profile!.bio,
        locationCity: cand.profile!.locationCity,
        locationCountry: cand.profile!.locationCountry,
        relationshipIntent: cand.profile!.relationshipIntent,
        photos: cand.photos.map((p) => ({
          id: p.id,
          publicUrl: p.publicUrl,
          isPrimary: p.isPrimary,
        })),
        interests: candInterests,
        prompts: cand.prompts.map((pr) => ({
          id: pr.id,
          promptText: pr.promptText,
          answer: pr.answer,
        })),
        compatibility,
      };
    });

    // Sort by compatibility score descending
    scoredCandidates.sort((a, b) => b.compatibility.score - a.compatibility.score);

    return scoredCandidates.slice(0, limit);
  } catch (error) {
    logger.error("Error generating discovery feed", error, { userId });
    throw error;
  }
}
