import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { cancelMemberSubscription } from "@/lib/subscriptions/payment-service";
import { logger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized: Sign in required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const immediate = Boolean(body.immediate);

    const updatedSub = await cancelMemberSubscription(actor.userId, immediate);

    return NextResponse.json(
      {
        success: true,
        message: immediate
          ? "Subscription canceled immediately. Your plan has been reverted to Free."
          : "Subscription cancellation scheduled. You will retain paid features until the end of the billing period.",
        subscription: updatedSub,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Error cancelling subscription", error);
    return NextResponse.json({ error: error.message || "Failed to cancel subscription." }, { status: 400 });
  }
}
