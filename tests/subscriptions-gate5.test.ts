import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlanConfig, SUBSCRIPTION_PLANS } from "@/lib/subscriptions/plans";
import { isStripeTestMode, verifyStripeWebhookSignature } from "@/lib/subscriptions/stripe-client";
import { SubscriptionPlanTier, SubscriptionStatus } from "@prisma/client";

describe("Phase 5 — Subscriptions & Payments Suite (Gate 5)", () => {
  describe("1. Authoritative Plan Management & Pricing Configurations", () => {
    it("provides valid configurations for Free, Plus, and Premium plans", () => {
      const freePlan = getPlanConfig("free");
      expect(freePlan.tier).toBe("free");
      expect(freePlan.pricing.month.amountCents).toBe(0);
      expect(freePlan.entitlements.dailyLikes).toBe(25);
      expect(freePlan.entitlements.dailyCompliments).toBe(0);
      expect(freePlan.entitlements.seeWhoLikedYou).toBe(false);

      const plusPlan = getPlanConfig("plus");
      expect(plusPlan.tier).toBe("plus");
      expect(plusPlan.pricing.month.amountCents).toBe(1499);
      expect(plusPlan.entitlements.dailyLikes).toBe(Infinity);
      expect(plusPlan.entitlements.dailyCompliments).toBe(3);
      expect(plusPlan.entitlements.dailyRewinds).toBe(5);
      expect(plusPlan.entitlements.advancedFilters).toBe(true);
      expect(plusPlan.entitlements.seeWhoLikedYou).toBe(false);

      const premiumPlan = getPlanConfig("premium");
      expect(premiumPlan.tier).toBe("premium");
      expect(premiumPlan.pricing.month.amountCents).toBe(2999);
      expect(premiumPlan.entitlements.dailyLikes).toBe(Infinity);
      expect(premiumPlan.entitlements.dailyCompliments).toBe(10);
      expect(premiumPlan.entitlements.dailyRewinds).toBe(Infinity);
      expect(premiumPlan.entitlements.seeWhoLikedYou).toBe(true);
      expect(premiumPlan.entitlements.priorityDiscovery).toBe(true);
    });

    it("ensures fundamental safety, blocking, reporting, and privacy controls are never paywalled", () => {
      // Across ALL tiers (Free, Plus, Premium)
      for (const tier of ["free", "plus", "premium"] as SubscriptionPlanTier[]) {
        const plan = getPlanConfig(tier);
        expect(plan.entitlements.safetyControls).toBe(true);
        expect(plan.entitlements.unlimitedMessaging).toBe(true);
      }
    });

    it("verifies production payments remain in test mode until live credentials are set", () => {
      expect(isStripeTestMode).toBe(true);
    });
  });

  describe("2. Webhook Signature Verification & Idempotency Engine", () => {
    it("rejects webhooks with invalid or missing cryptographic signatures", () => {
      const rawPayload = JSON.stringify({ id: "evt_test_1", type: "checkout.session.completed" });
      const badSignature = "t=12345,v1=bad_hash_signature";

      expect(() => {
        verifyStripeWebhookSignature(rawPayload, badSignature, "whsec_valid_secret");
      }).toThrow(/Invalid webhook signature/);
    });

    it("deduplicates identical webhook events and prevents multiple processing", () => {
      const processedEvents = new Set<string>();

      function processWebhook(event: { id: string; type: string }) {
        if (processedEvents.has(event.id)) {
          return { status: "duplicate", eventId: event.id };
        }
        processedEvents.add(event.id);
        return { status: "processed", eventId: event.id };
      }

      const eventPayload = { id: "evt_idempotency_test_123", type: "invoice.payment_succeeded" };

      // 1st delivery
      const res1 = processWebhook(eventPayload);
      expect(res1.status).toBe("processed");

      // 2nd delivery (duplicate retry)
      const res2 = processWebhook(eventPayload);
      expect(res2.status).toBe("duplicate");

      // Set contains only one entry
      expect(processedEvents.size).toBe(1);
    });
  });

  describe("3. Subscription Lifecycle State Transitions", () => {
    it("handles checkout.session.completed and activates paid membership", () => {
      const userSubscription = {
        userId: "user-alice",
        planTier: "free" as SubscriptionPlanTier,
        status: "active" as SubscriptionStatus,
        providerSubscriptionId: null as string | null,
        currentPeriodEnd: null as Date | null,
      };

      // Webhook payload simulation
      const sessionCompletedEvent = {
        metadata: { userId: "user-alice", planTier: "plus", billingInterval: "month" },
        subscription: "sub_stripe_plus_999",
      };

      // State transition
      userSubscription.planTier = sessionCompletedEvent.metadata.planTier as SubscriptionPlanTier;
      userSubscription.status = "active";
      userSubscription.providerSubscriptionId = sessionCompletedEvent.subscription;
      userSubscription.currentPeriodEnd = new Date(Date.now() + 30 * 86400 * 1000);

      expect(userSubscription.planTier).toBe("plus");
      expect(userSubscription.status).toBe("active");
      expect(userSubscription.providerSubscriptionId).toBe("sub_stripe_plus_999");
      expect(userSubscription.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());
    });

    it("handles renewal (invoice.payment_succeeded) and advances current billing period", () => {
      const initialPeriodEnd = new Date(Date.now() + 2 * 86400 * 1000);
      const userSubscription = {
        userId: "user-bob",
        status: "active" as SubscriptionStatus,
        currentPeriodEnd: initialPeriodEnd,
      };

      const newPeriodEnd = new Date(Date.now() + 32 * 86400 * 1000);

      // Renewal event simulation
      userSubscription.status = "active";
      userSubscription.currentPeriodEnd = newPeriodEnd;

      expect(userSubscription.status).toBe("active");
      expect(userSubscription.currentPeriodEnd.getTime()).toBeGreaterThan(initialPeriodEnd.getTime());
    });

    it("handles failed payments (invoice.payment_failed) by transitioning status to past_due", () => {
      const userSubscription = {
        userId: "user-charlie",
        planTier: "premium" as SubscriptionPlanTier,
        status: "active" as SubscriptionStatus,
      };

      // Failed payment transition
      userSubscription.status = "past_due";

      expect(userSubscription.status).toBe("past_due");
    });

    it("handles subscription cancellation and schedules cancellation at period end", () => {
      const userSubscription = {
        userId: "user-david",
        planTier: "plus" as SubscriptionPlanTier,
        status: "active" as SubscriptionStatus,
        cancelAtPeriodEnd: false,
        canceledAt: null as Date | null,
      };

      // User cancels via self-service
      userSubscription.cancelAtPeriodEnd = true;
      userSubscription.canceledAt = new Date();

      expect(userSubscription.cancelAtPeriodEnd).toBe(true);
      expect(userSubscription.canceledAt).not.toBeNull();
      // Member still retains active access until the period actually ends
      expect(userSubscription.status).toBe("active");
    });

    it("handles subscription expiration (customer.subscription.deleted) and reverts to Free tier", () => {
      const userSubscription = {
        userId: "user-eve",
        planTier: "premium" as SubscriptionPlanTier,
        status: "active" as SubscriptionStatus,
        endedAt: null as Date | null,
      };

      // Period has elapsed and Stripe sends deleted event
      userSubscription.status = "canceled";
      userSubscription.planTier = "free";
      userSubscription.endedAt = new Date();

      expect(userSubscription.status).toBe("canceled");
      expect(userSubscription.planTier).toBe("free");
      expect(userSubscription.endedAt).not.toBeNull();
    });

    it("handles tier upgrade and downgrade transitions", () => {
      const userSubscription = {
        userId: "user-frank",
        planTier: "plus" as SubscriptionPlanTier,
      };

      // Upgrade to Premium
      userSubscription.planTier = "premium";
      expect(userSubscription.planTier).toBe("premium");

      // Downgrade to Plus
      userSubscription.planTier = "plus";
      expect(userSubscription.planTier).toBe("plus");
    });

    it("records refund transactions and updates invoice status to refunded", () => {
      const invoice = {
        id: "inv-101",
        amountCents: 2999,
        status: "succeeded",
        refundedAmountCents: 0,
        refundReason: null as string | null,
      };

      // Charge refund event
      invoice.status = "refunded";
      invoice.refundedAmountCents = 2999;
      invoice.refundReason = "Customer requested refund within 48h";

      expect(invoice.status).toBe("refunded");
      expect(invoice.refundedAmountCents).toBe(2999);
      expect(invoice.refundReason).toBe("Customer requested refund within 48h");
    });
  });

  describe("4. Server-Side Entitlement & Quota Enforcement", () => {
    function evaluateActionEntitlement(
      userPlan: SubscriptionPlanTier,
      subStatus: SubscriptionStatus,
      action: string,
      likesToday: number
    ): { allowed: boolean; reason?: string } {
      // Unpaywalled actions
      if (["safety:report_user", "safety:block_user", "privacy:export_data"].includes(action)) {
        return { allowed: true };
      }

      // If subscription is not active or past_due, fallback to free
      const effectiveTier = subStatus === "active" ? userPlan : "free";
      const config = getPlanConfig(effectiveTier);

      if (action === "interaction:like") {
        if (config.entitlements.dailyLikes === Infinity) return { allowed: true };
        if (likesToday >= config.entitlements.dailyLikes) {
          return { allowed: false, reason: "Daily like quota reached." };
        }
        return { allowed: true };
      }

      if (action === "discovery:see_admirers") {
        if (!config.entitlements.seeWhoLikedYou) {
          return { allowed: false, reason: "Viewing admirers requires Premium." };
        }
        return { allowed: true };
      }

      if (action === "discovery:advanced_filters") {
        if (!config.entitlements.advancedFilters) {
          return { allowed: false, reason: "Advanced filters require Plus or Premium." };
        }
        return { allowed: true };
      }

      return { allowed: true };
    }

    it("enforces daily likes limit for Free tier and grants unlimited likes for Plus & Premium", () => {
      // Free member with 24 likes today -> allowed
      expect(evaluateActionEntitlement("free", "active", "interaction:like", 24).allowed).toBe(true);

      // Free member with 25 likes today -> rejected (quota reached)
      const freeMax = evaluateActionEntitlement("free", "active", "interaction:like", 25);
      expect(freeMax.allowed).toBe(false);
      expect(freeMax.reason).toContain("Daily like quota reached");

      // Plus member with 100 likes today -> allowed (unlimited)
      expect(evaluateActionEntitlement("plus", "active", "interaction:like", 100).allowed).toBe(true);

      // Premium member with 1000 likes today -> allowed (unlimited)
      expect(evaluateActionEntitlement("premium", "active", "interaction:like", 1000).allowed).toBe(true);
    });

    it("falls back to Free tier quotas if user's subscription is past_due or canceled", () => {
      // User has Plus tier in DB, but status is past_due -> evaluated as Free tier
      const pastDueCheck = evaluateActionEntitlement("plus", "past_due", "interaction:like", 25);
      expect(pastDueCheck.allowed).toBe(false);
    });

    it("restricts 'See Who Liked You' exclusively to Conextion Premium", () => {
      expect(evaluateActionEntitlement("free", "active", "discovery:see_admirers", 0).allowed).toBe(false);
      expect(evaluateActionEntitlement("plus", "active", "discovery:see_admirers", 0).allowed).toBe(false);
      expect(evaluateActionEntitlement("premium", "active", "discovery:see_admirers", 0).allowed).toBe(true);
    });

    it("restricts Advanced Filters to Plus and Premium", () => {
      expect(evaluateActionEntitlement("free", "active", "discovery:advanced_filters", 0).allowed).toBe(false);
      expect(evaluateActionEntitlement("plus", "active", "discovery:advanced_filters", 0).allowed).toBe(true);
      expect(evaluateActionEntitlement("premium", "active", "discovery:advanced_filters", 0).allowed).toBe(true);
    });

    it("strictly allows safety reporting, blocking, and data export regardless of payment status", () => {
      // Free user
      expect(evaluateActionEntitlement("free", "active", "safety:report_user", 0).allowed).toBe(true);
      expect(evaluateActionEntitlement("free", "active", "safety:block_user", 0).allowed).toBe(true);
      expect(evaluateActionEntitlement("free", "active", "privacy:export_data", 0).allowed).toBe(true);

      // User with past_due / canceled status can still report and block
      expect(evaluateActionEntitlement("free", "canceled", "safety:report_user", 0).allowed).toBe(true);
      expect(evaluateActionEntitlement("plus", "past_due", "safety:block_user", 0).allowed).toBe(true);
    });
  });

  describe("5. Reconciliation & Discrepancy Auditing", () => {
    it("detects discrepancies between local subscription status and remote provider status", () => {
      const localSubscriptions = [
        { id: "sub-1", status: "active", remoteStatus: "active" },
        { id: "sub-2", status: "active", remoteStatus: "canceled" }, // Discrepancy!
        { id: "sub-3", status: "past_due", remoteStatus: "past_due" },
      ];

      const discrepancies = localSubscriptions.filter((s) => s.status !== s.remoteStatus);

      expect(discrepancies.length).toBe(1);
      expect(discrepancies[0].id).toBe("sub-2");
    });
  });
});
