import { NextRequest, NextResponse } from "next/server";
import { processStripeWebhook } from "@/lib/subscriptions/payment-service";
import { logger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
    }

    const rawBody = await request.text();

    const result = await processStripeWebhook(rawBody, signature);

    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (error: any) {
    logger.warn("Stripe webhook processing error", { error: error.message });
    return NextResponse.json({ error: error.message || "Webhook processing failed." }, { status: 400 });
  }
}
