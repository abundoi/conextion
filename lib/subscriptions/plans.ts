import { SubscriptionPlanTier, SubscriptionBillingInterval } from "@prisma/client";

export interface PlanEntitlements {
  dailyLikes: number;
  dailyCompliments: number;
  dailyRewinds: number;
  seeWhoLikedYou: boolean;
  advancedFilters: boolean;
  priorityDiscovery: boolean;
  unlimitedMessaging: boolean; // Messaging with matches is never paywalled
  safetyControls: boolean; // Blocking, reporting, privacy export are ALWAYS enabled
}

export interface PlanConfig {
  tier: SubscriptionPlanTier;
  name: string;
  tagline: string;
  pricing: {
    month: {
      amountCents: number;
      currency: string;
      stripePriceId: string;
    };
    year: {
      amountCents: number;
      currency: string;
      stripePriceId: string;
      discountLabel: string;
    };
  };
  entitlements: PlanEntitlements;
  highlights: string[];
}

/**
 * Authoritative Server-Side Plan Configurations.
 * Pricing, feature entitlements, and quotas are evaluated strictly on the server.
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanTier, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free",
    tagline: "Standard discovery and genuine connections.",
    pricing: {
      month: { amountCents: 0, currency: "usd", stripePriceId: "" },
      year: { amountCents: 0, currency: "usd", stripePriceId: "", discountLabel: "" },
    },
    entitlements: {
      dailyLikes: 25,
      dailyCompliments: 0,
      dailyRewinds: 0,
      seeWhoLikedYou: false,
      advancedFilters: false,
      priorityDiscovery: false,
      unlimitedMessaging: true,
      safetyControls: true,
    },
    highlights: [
      "25 daily candidate likes",
      "Standard discovery feed",
      "Unlimited messaging with mutual matches",
      "Full trust, safety & privacy protections",
    ],
  },
  plus: {
    tier: "plus",
    name: "Conextion Plus",
    tagline: "Elevated discovery with unlimited swiping and rewind control.",
    pricing: {
      month: {
        amountCents: 1499,
        currency: "usd",
        stripePriceId: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID || "price_plus_monthly_test",
      },
      year: {
        amountCents: 11999,
        currency: "usd",
        stripePriceId: process.env.STRIPE_PLUS_YEARLY_PRICE_ID || "price_plus_yearly_test",
        discountLabel: "Save 33%",
      },
    },
    entitlements: {
      dailyLikes: Infinity,
      dailyCompliments: 3,
      dailyRewinds: 5,
      seeWhoLikedYou: false,
      advancedFilters: true,
      priorityDiscovery: false,
      unlimitedMessaging: true,
      safetyControls: true,
    },
    highlights: [
      "Unlimited candidate likes",
      "5 rewind passes per day",
      "3 complimentary icebreakers daily",
      "Advanced lifestyle & intent filters",
      "Ad-free premium experience",
    ],
  },
  premium: {
    tier: "premium",
    name: "Conextion Premium",
    tagline: "The definitive relationship discovery suite with priority matching.",
    pricing: {
      month: {
        amountCents: 2999,
        currency: "usd",
        stripePriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_premium_monthly_test",
      },
      year: {
        amountCents: 23999,
        currency: "usd",
        stripePriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || "price_premium_yearly_test",
        discountLabel: "Save 33%",
      },
    },
    entitlements: {
      dailyLikes: Infinity,
      dailyCompliments: 10,
      dailyRewinds: Infinity,
      seeWhoLikedYou: true,
      advancedFilters: true,
      priorityDiscovery: true,
      unlimitedMessaging: true,
      safetyControls: true,
    },
    highlights: [
      "See who liked you before matching",
      "Priority candidate discovery (2x matching exposure)",
      "Unlimited candidate rewinds",
      "10 complimentary icebreakers daily",
      "Global Passport travel mode",
      "Full VIP concierge support",
    ],
  },
};

/**
 * Returns plan configuration for a given tier.
 */
export function getPlanConfig(tier: SubscriptionPlanTier): PlanConfig {
  return SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free;
}
