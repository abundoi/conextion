export interface ScoringCandidate {
  id: string;
  computedAge: number;
  gender: string;
  relationshipIntent: string;
  locationCity?: string | null;
  locationCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  interests: { id: string; name: string; slug: string }[];
}

export interface ViewerPreferences {
  userId: string;
  minAgePreference: number;
  maxAgePreference: number;
  maxDistanceKm: number;
  interestedInGenders: string[];
  relationshipIntentFilter: string[];
  interests: { id: string; name: string; slug: string }[];
  relationshipIntent: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CompatibilityReport {
  score: number; // 0 to 100
  percentage: number;
  highlights: string[];
  sharedInterests: string[];
  intentAligned: boolean;
  distanceKm?: number;
}

/**
 * Calculates approximate great-circle distance between two geographic coordinates (Haversine formula).
 */
export function calculateDistanceKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number | undefined {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return undefined;
  }

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Computes an explainable, non-discriminatory compatibility score between the viewer and a candidate.
 * Weights are transparent product hypotheses based on shared interests and relationship intent.
 */
export function computeCompatibility(
  viewer: ViewerPreferences,
  candidate: ScoringCandidate
): CompatibilityReport {
  const highlights: string[] = [];
  let score = 50; // Neutral baseline

  // 1. Shared Interests
  const viewerInterestSlugs = new Set(viewer.interests.map((i) => i.slug));
  const shared = candidate.interests.filter((i) => viewerInterestSlugs.has(i.slug));
  const sharedInterestNames = shared.map((i) => i.name);

  if (shared.length > 0) {
    const interestBoost = Math.min(shared.length * 10, 30);
    score += interestBoost;
    highlights.push(
      shared.length === 1
        ? `Shared Interest: ${shared[0].name}`
        : `${shared.length} Shared Interests (${sharedInterestNames.slice(0, 3).join(", ")})`
    );
  }

  // 2. Relationship Intent Alignment
  const intentAligned =
    viewer.relationshipIntent === candidate.relationshipIntent ||
    candidate.relationshipIntent === "open_to_options" ||
    viewer.relationshipIntent === "open_to_options";

  if (viewer.relationshipIntent === candidate.relationshipIntent) {
    score += 20;
    highlights.push(`Aligned Intent: ${candidate.relationshipIntent.replace("_", " ")}`);
  } else if (intentAligned) {
    score += 10;
    highlights.push("Open Relationship Horizons");
  }

  // 3. Distance Proximity
  const distanceKm = calculateDistanceKm(
    viewer.latitude,
    viewer.longitude,
    candidate.latitude,
    candidate.longitude
  );

  if (distanceKm !== undefined) {
    if (distanceKm <= 15) {
      score += 10;
      highlights.push("Nearby (< 15 km)");
    } else if (distanceKm <= viewer.maxDistanceKm) {
      score += 5;
      highlights.push(`Within Discovery Radius (~${distanceKm} km)`);
    }
  }

  // Normalize final score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: finalScore,
    percentage: finalScore,
    highlights,
    sharedInterests: sharedInterestNames,
    intentAligned,
    distanceKm,
  };
}
