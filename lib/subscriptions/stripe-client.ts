import Stripe from "stripe";
import { logger } from "../logging/logger";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_conextion_key_12345";
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder_conextion_test_key";

/**
 * Checks whether Stripe is running in test mode or with synthetic test credentials.
 */
export const isStripeTestMode =
  stripeSecretKey.startsWith("sk_test_") ||
  stripeSecretKey.includes("placeholder") ||
  process.env.NODE_ENV !== "production";

/**
 * Centralized Stripe SDK Instance.
 */
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as any,
  typescript: true,
  appInfo: {
    name: "Conextion Dating Platform",
    version: "0.1.0",
  },
});

/**
 * Verifies signed webhook payload from Stripe.
 */
export function verifyStripeWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  secret = stripeWebhookSecret
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error: any) {
    logger.warn("Stripe webhook cryptographic signature verification failed", { error: error.message });
    throw new Error(`Invalid webhook signature: ${error.message}`);
  }
}
