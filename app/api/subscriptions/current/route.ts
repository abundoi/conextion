import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { getMemberSubscription } from "@/lib/subscriptions/payment-service";
import { getMemberEntitlements } from "@/lib/subscriptions/entitlements-service";
import { getPlanConfig } from "@/lib/subscriptions/plans";
import { logger } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const subscription = await getMemberSubscription(actor.userId);
    const entitlementsSummary = await getMemberEntitlements(actor.userId);
    const planConfig = getPlanConfig(entitlementsSummary.planTier);

    return NextResponse.json(
      {
        success: true,
        subscription,
        entitlements: entitlementsSummary,
        planConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Error retrieving subscription info", error);
    return NextResponse.json({ error: "Failed to retrieve subscription." }, { status: 500 });
  }
}
