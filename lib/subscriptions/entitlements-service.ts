import { prisma } from "../db/prisma";
import { getPlanConfig, PlanEntitlements } from "./plans";
import { SubscriptionPlanTier } from "@prisma/client";
import { logger } from "../logging/logger";

export interface MemberEntitlementsSummary {
  userId: string;
  planTier: SubscriptionPlanTier;
  status: string;
  isPaidActive: boolean;
  entitlements: PlanEntitlements;
  quotas: {
    likesUsedToday: number;
    likesRemaining: number;
    complimentsUsedToday: number;
    complimentsRemaining: number;
  };
}

/**
 * Fundamental safety actions that must NEVER depend on payment.
 */
const UNPAYWALLED_ACTIONS = new Set([
  "safety:report_user",
  "safety:block_user",
  "privacy:export_data",
  "privacy:delete_account",
  "messaging:send_match_message",
  "auth:sign_out",
]);

/**
 * Retrieves the authoritative server-side entitlements for a member.
 */
export async function getMemberEntitlements(userId: string): Promise<MemberEntitlementsSummary> {
  // 1. Fetch active subscription record
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trialing"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  let effectiveTier: SubscriptionPlanTier = "free";
  let status = "active";
  let isPaidActive = false;

  if (subscription) {
    // Verify period validity
    const isPeriodValid = !subscription.currentPeriodEnd || subscription.currentPeriodEnd > now;
    if (isPeriodValid && (subscription.planTier === "plus" || subscription.planTier === "premium")) {
      effectiveTier = subscription.planTier;
      status = subscription.status;
      isPaidActive = true;
    }
  }

  const planConfig = getPlanConfig(effectiveTier);

  // 2. Compute today's usage quotas (from midnight UTC)
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const likesCountToday = await prisma.interaction.count({
    where: {
      actorId: userId,
      type: "like",
      createdAt: { gte: startOfDay },
    },
  });

  const complimentsCountToday = await prisma.interaction.count({
    where: {
      actorId: userId,
      type: "compliment",
      createdAt: { gte: startOfDay },
    },
  });

  const likesRemaining =
    planConfig.entitlements.dailyLikes === Infinity
      ? 999999
      : Math.max(0, planConfig.entitlements.dailyLikes - likesCountToday);

  const complimentsRemaining = Math.max(
    0,
    planConfig.entitlements.dailyCompliments - complimentsCountToday
  );

  return {
    userId,
    planTier: effectiveTier,
    status,
    isPaidActive,
    entitlements: planConfig.entitlements,
    quotas: {
      likesUsedToday: likesCountToday,
      likesRemaining,
      complimentsUsedToday: complimentsCountToday,
      complimentsRemaining,
    },
  };
}

/**
 * Asserts whether a member is entitled to perform a given action.
 * Throws a descriptive error if the action is paywalled or quota is exhausted.
 */
export async function assertCanPerformAction(userId: string, action: string): Promise<void> {
  // Always allow unpaywalled safety & privacy actions
  if (UNPAYWALLED_ACTIONS.has(action)) {
    return;
  }

  const summary = await getMemberEntitlements(userId);

  switch (action) {
    case "interaction:like":
      if (summary.quotas.likesRemaining <= 0) {
        throw new Error(
          "Daily like quota reached. Upgrade to Conextion Plus or Premium for unlimited candidate likes."
        );
      }
      break;

    case "interaction:compliment":
      if (summary.quotas.complimentsRemaining <= 0) {
        throw new Error(
          "Daily complimentary icebreaker quota reached. Upgrade to Conextion Premium for 10 icebreakers per day."
        );
      }
      break;

    case "discovery:see_admirers":
      if (!summary.entitlements.seeWhoLikedYou) {
        throw new Error(
          "Viewing admirers requires Conextion Premium. Upgrade to see everyone who liked your profile."
        );
      }
      break;

    case "discovery:advanced_filters":
      if (!summary.entitlements.advancedFilters) {
        throw new Error(
          "Advanced compatibility filters require Conextion Plus or Premium."
        );
      }
      break;

    default:
      break;
  }
}
