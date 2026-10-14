import { prisma } from "../db/prisma";
import { AuthContext, enforceRole } from "../auth/rbac";
import { logger } from "../logging/logger";

export interface PlatformMetrics {
  overview: {
    eligibleRegistrations: number;
    activeMembers: number;
    suspendedOrBanned: number;
    completedProfiles: number;
    profileCompletionRate: number; // percentage
  };
  engagement: {
    totalInteractions: number;
    totalLikes: number;
    totalPasses: number;
    likeRatio: number; // percentage
    mutualMatches: number;
    matchConversionRate: number; // % of likes that yielded mutual matches
    totalConversations: number;
    totalMessagesSent: number;
  };
  retention: {
    weeklyCohortActive: number; // active accounts created >= 7 days ago
    monthlyCohortActive: number; // active accounts created >= 30 days ago
  };
  monetization: {
    paidSubscriptions: number;
    freeSubscriptions: number;
    subscriptionConversionRate: number; // % of active users on paid plan
    churnedSubscriptions: number;
    churnRate: number; // % canceled vs total paid
    totalGrossRevenueCents: number;
    totalGrossRevenueFormatted: string;
    totalRefundedCents: number;
  };
  safetyAndModeration: {
    totalReportsFiled: number;
    pendingCases: number;
    resolvedCases: number;
    criticalSlaCases: number;
    meanResolutionTimeMinutes: number;
    moderatorWorkload: { reviewerId: string; reviewerEmail: string; casesResolved: number }[];
  };
  generatedAt: string;
}

/**
 * Computes database-backed analytics and platform metrics.
 * Permitted for: super_admin, finance_admin, safety_admin, and analytics_viewer.
 */
export async function getPlatformMetrics(actor?: AuthContext): Promise<PlatformMetrics> {
  if (actor) {
    enforceRole(actor, ["super_admin", "finance_admin", "safety_admin", "analytics_viewer"]);
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000);

  // 1. Overview Metrics
  const [
    totalUsers,
    activeUsers,
    restrictedUsers,
    completedProfilesCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { accountStatus: "active" } }),
    prisma.user.count({ where: { accountStatus: { in: ["suspended", "banned"] } } }),
    prisma.userProfile.count({ where: { isProfileComplete: true } }),
  ]);

  const profileCompletionRate =
    totalUsers > 0 ? Math.round((completedProfilesCount / totalUsers) * 1000) / 10 : 0;

  // 2. Engagement Metrics
  const [
    totalInteractions,
    totalLikes,
    totalPasses,
    totalMatches,
    totalConversations,
    totalMessagesSent,
  ] = await Promise.all([
    prisma.interaction.count(),
    prisma.interaction.count({ where: { type: "like" } }),
    prisma.interaction.count({ where: { type: "pass" } }),
    prisma.match.count({ where: { status: "active" } }),
    prisma.conversation.count(),
    prisma.message.count(),
  ]);

  const likeRatio =
    totalInteractions > 0 ? Math.round((totalLikes / totalInteractions) * 1000) / 10 : 0;
  const matchConversionRate =
    totalLikes > 0 ? Math.round(((totalMatches * 2) / totalLikes) * 1000) / 10 : 0;

  // 3. Retention Cohorts
  const [weeklyCohortActive, monthlyCohortActive] = await Promise.all([
    prisma.user.count({
      where: {
        accountStatus: "active",
        createdAt: { lte: sevenDaysAgo },
      },
    }),
    prisma.user.count({
      where: {
        accountStatus: "active",
        createdAt: { lte: thirtyDaysAgo },
      },
    }),
  ]);

  // 4. Monetization & Subscriptions
  const [
    paidSubCount,
    freeSubCount,
    churnedSubCount,
    revenueAgg,
    refundAgg,
  ] = await Promise.all([
    prisma.subscription.count({
      where: {
        planTier: { in: ["plus", "premium"] },
        status: { in: ["active", "trialing"] },
      },
    }),
    prisma.subscription.count({
      where: { planTier: "free" },
    }),
    prisma.subscription.count({
      where: { status: "canceled" },
    }),
    prisma.paymentInvoice.aggregate({
      where: { status: "succeeded" },
      _sum: { amountCents: true },
    }),
    prisma.paymentInvoice.aggregate({
      where: { status: "refunded" },
      _sum: { refundedAmountCents: true },
    }),
  ]);

  const totalGrossRevenueCents = revenueAgg._sum.amountCents || 0;
  const totalRefundedCents = refundAgg._sum.refundedAmountCents || 0;
  const subscriptionConversionRate =
    activeUsers > 0 ? Math.round((paidSubCount / activeUsers) * 1000) / 10 : 0;
  const totalPaidEver = paidSubCount + churnedSubCount;
  const churnRate =
    totalPaidEver > 0 ? Math.round((churnedSubCount / totalPaidEver) * 1000) / 10 : 0;

  // 5. Safety & Moderation Workload
  const [
    totalReportsFiled,
    pendingCases,
    resolvedCases,
    criticalSlaCases,
    resolvedCasesWithTimestamps,
  ] = await Promise.all([
    prisma.moderationCase.count(),
    prisma.moderationCase.count({ where: { status: "pending" } }),
    prisma.moderationCase.count({ where: { status: "reviewed" } }),
    prisma.moderationCase.count({ where: { priority: "critical" } }),
    prisma.moderationCase.findMany({
      where: { status: "reviewed", resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true, assignedToId: true },
      take: 100,
    }),
  ]);

  let totalResolutionMinutes = 0;
  const workloadMap: Record<string, number> = {};

  for (const c of resolvedCasesWithTimestamps) {
    if (c.resolvedAt) {
      const diffMs = c.resolvedAt.getTime() - c.createdAt.getTime();
      totalResolutionMinutes += diffMs / (1000 * 60);
    }
    if (c.assignedToId) {
      workloadMap[c.assignedToId] = (workloadMap[c.assignedToId] || 0) + 1;
    }
  }

  const meanResolutionTimeMinutes =
    resolvedCasesWithTimestamps.length > 0
      ? Math.round(totalResolutionMinutes / resolvedCasesWithTimestamps.length)
      : 0;

  // Fetch reviewer emails for workload attribution
  const reviewerIds = Object.keys(workloadMap);
  const reviewers = await prisma.user.findMany({
    where: { id: { in: reviewerIds } },
    select: { id: true, email: true },
  });

  const moderatorWorkload = reviewers.map((r) => ({
    reviewerId: r.id,
    reviewerEmail: r.email,
    casesResolved: workloadMap[r.id] || 0,
  }));

  logger.info("Platform analytics computed", {
    activeMembers: activeUsers,
    totalGrossRevenueCents,
  });

  return {
    overview: {
      eligibleRegistrations: totalUsers,
      activeMembers: activeUsers,
      suspendedOrBanned: restrictedUsers,
      completedProfiles: completedProfilesCount,
      profileCompletionRate,
    },
    engagement: {
      totalInteractions,
      totalLikes,
      totalPasses,
      likeRatio,
      mutualMatches: totalMatches,
      matchConversionRate,
      totalConversations,
      totalMessagesSent,
    },
    retention: {
      weeklyCohortActive,
      monthlyCohortActive,
    },
    monetization: {
      paidSubscriptions: paidSubCount,
      freeSubscriptions: freeSubCount,
      subscriptionConversionRate,
      churnedSubscriptions: churnedSubCount,
      churnRate,
      totalGrossRevenueCents,
      totalGrossRevenueFormatted: `$${(totalGrossRevenueCents / 100).toFixed(2)}`,
      totalRefundedCents,
    },
    safetyAndModeration: {
      totalReportsFiled,
      pendingCases,
      resolvedCases,
      criticalSlaCases,
      meanResolutionTimeMinutes,
      moderatorWorkload,
    },
    generatedAt: now.toISOString(),
  };
}
