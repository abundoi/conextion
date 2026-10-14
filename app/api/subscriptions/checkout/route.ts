import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createCheckoutSession } from "@/lib/subscriptions/payment-service";
import { logger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    if (actor.accountStatus !== "active") {
      return NextResponse.json({ error: "Account access restricted." }, { status: 403 });
    }

    const body = await request.json();
    const { planTier, billingInterval, returnUrl } = body;

    if (!planTier || !["plus", "premium"].includes(planTier)) {
      return NextResponse.json({ error: "Invalid planTier. Must be 'plus' or 'premium'." }, { status: 400 });
    }

    if (!billingInterval || !["month", "year"].includes(billingInterval)) {
      return NextResponse.json({ error: "Invalid billingInterval. Must be 'month' or 'year'." }, { status: 400 });
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const defaultReturnUrl = `${protocol}://${host}/settings/subscription`;

    const { checkoutUrl, sessionId } = await createCheckoutSession({
      userId: actor.userId,
      email: actor.email,
      planTier,
      billingInterval,
      returnUrl: returnUrl || defaultReturnUrl,
    });

    return NextResponse.json({ success: true, checkoutUrl, sessionId }, { status: 200 });
  } catch (error: any) {
    logger.error("Error creating checkout session", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout session." }, { status: 400 });
  }
}
