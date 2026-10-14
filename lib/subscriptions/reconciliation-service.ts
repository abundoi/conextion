import { prisma } from "../db/prisma";
import { stripe } from "./stripe-client";
import { AuthContext, enforceRole } from "../auth/rbac";
import { logger } from "../logging/logger";

export interface DiscrepancyDetail {
  subscriptionId: string;
  userId: string;
  providerSubscriptionId?: string;
  issue: string;
  localStatus: string;
  remoteStatus?: string;
  recommendedAction: string;
}

export interface ReconciliationReport {
  reconciliationId: string;
  totalChecked: number;
  mismatchesFound: number;
  status: "matched" | "discrepancies_detected";
  discrepancies: DiscrepancyDetail[];
  reconciledAt: string;
}

/**
 * Reconciles internal database subscription records against Stripe provider records.
 * Accessible strictly to authorized finance & super admins.
 */
export async function reconcileSubscriptions(actor?: AuthContext): Promise<ReconciliationReport> {
  if (actor) {
    enforceRole(actor, ["finance_admin", "super_admin"]);
  }

  // 1. Fetch all local paid subscriptions
  const localSubscriptions = await prisma.subscription.findMany({
    where: {
      planTier: { in: ["plus", "premium"] },
    },
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  const discrepancies: DiscrepancyDetail[] = [];

  for (const localSub of localSubscriptions) {
    // If no provider ID attached
    if (!localSub.providerSubscriptionId) {
      discrepancies.push({
        subscriptionId: localSub.id,
        userId: localSub.userId,
        issue: "Paid tier assigned locally without Stripe subscription ID",
        localStatus: localSub.status,
        recommendedAction: "Verify manual billing entitlement or revert to free tier",
      });
      continue;
    }

    try {
      // Query Stripe directly
      const stripeSub = await stripe.subscriptions.retrieve(localSub.providerSubscriptionId);

      // Check status parity
      if (stripeSub.status !== localSub.status) {
        discrepancies.push({
          subscriptionId: localSub.id,
          userId: localSub.userId,
          providerSubscriptionId: localSub.providerSubscriptionId,
          issue: `Status mismatch: Local DB is '${localSub.status}', Stripe is '${stripeSub.status}'`,
          localStatus: localSub.status,
          remoteStatus: stripeSub.status,
          recommendedAction: `Update local status to '${stripeSub.status}'`,
        });
      }
    } catch (err: any) {
      if (err.statusCode === 404 || err.code === "resource_missing") {
        discrepancies.push({
          subscriptionId: localSub.id,
          userId: localSub.userId,
          providerSubscriptionId: localSub.providerSubscriptionId,
          issue: "Stripe subscription not found on remote provider",
          localStatus: localSub.status,
          recommendedAction: "Mark local subscription canceled",
        });
      } else {
        logger.warn("Reconciliation transient check failure", { error: err.message, subId: localSub.id });
      }
    }
  }

  const status = discrepancies.length > 0 ? "discrepancies_detected" : "matched";

  // 2. Persist reconciliation audit record
  const record = await prisma.reconciliationRecord.create({
    data: {
      reconciledById: actor?.userId || null,
      totalChecked: localSubscriptions.length,
      mismatchesFound: discrepancies.length,
      status,
      details: discrepancies as any,
    },
  });

  // 3. Create security audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor?.userId || "system:cron",
      action: "reconciliation:executed",
      targetEntity: "reconciliation_records",
      targetId: record.id,
      details: {
        totalChecked: localSubscriptions.length,
        mismatchesFound: discrepancies.length,
        status,
      },
    },
  });

  if (discrepancies.length > 0) {
    logger.warn("Billing reconciliation detected discrepancies", {
      totalMismatches: discrepancies.length,
      reconciliationId: record.id,
    });
  } else {
    logger.info("Billing reconciliation completed: All records matched perfectly", {
      totalChecked: localSubscriptions.length,
    });
  }

  return {
    reconciliationId: record.id,
    totalChecked: localSubscriptions.length,
    mismatchesFound: discrepancies.length,
    status,
    discrepancies,
    reconciledAt: record.createdAt.toISOString(),
  };
}
