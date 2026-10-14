import { prisma } from "../db/prisma";
import { stripe, verifyStripeWebhookSignature } from "./stripe-client";
import { getPlanConfig } from "./plans";
import {
  SubscriptionPlanTier,
  SubscriptionBillingInterval,
  SubscriptionStatus,
  PaymentStatus,
} from "@prisma/client";
import { logger } from "../logging/logger";
import Stripe from "stripe";

export interface CreateCheckoutParams {
  userId: string;
  email: string;
  planTier: "plus" | "premium";
  billingInterval: "month" | "year";
  returnUrl: string;
}

/**
 * Creates a Stripe Checkout Session for subscription purchase.
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<{ checkoutUrl: string; sessionId: string }> {
  const { userId, email, planTier, billingInterval, returnUrl } = params;
  const plan = getPlanConfig(planTier);
  const pricing = plan.pricing[billingInterval];

  // 1. Find or create Stripe Customer
  let customerId: string | undefined;
  const existingSub = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (existingSub?.providerCustomerId) {
    customerId = existingSub.providerCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  // 2. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: pricing.currency,
          product_data: {
            name: `${plan.name} (${billingInterval === "year" ? "Annual" : "Monthly"})`,
            description: plan.tagline,
          },
          unit_amount: pricing.amountCents,
          recurring: {
            interval: billingInterval,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      planTier,
      billingInterval,
    },
    subscription_data: {
      metadata: {
        userId,
        planTier,
        billingInterval,
      },
    },
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
  });

  if (!session.url) {
    throw new Error("Stripe failed to return a checkout session URL.");
  }

  logger.info("Stripe checkout session initialized", {
    userId,
    planTier,
    sessionId: session.id,
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

/**
 * Processes incoming Stripe webhook events with strict signature validation and idempotency.
 */
export async function processStripeWebhook(rawBody: string | Buffer, signature: string) {
  // 1. Verify cryptographic signature
  const event = verifyStripeWebhookSignature(rawBody, signature);

  // 2. Idempotency Check: prevent duplicate event processing
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { providerEventId: event.id },
  });

  if (existingEvent?.processed) {
    logger.info("Stripe webhook already processed; skipping duplicate", {
      eventId: event.id,
      type: event.type,
    });
    return { status: "duplicate", eventId: event.id };
  }

  // Record pending event in DB
  const webhookRecord = await prisma.webhookEvent.upsert({
    where: { providerEventId: event.id },
    create: {
      providerEventId: event.id,
      eventType: event.type,
      payload: event as any,
      processed: false,
    },
    update: {},
  });

  try {
    // 3. Dispatch to specific event handler
    await handleStripeEvent(event);

    // 4. Mark webhook event as successfully processed
    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        processed: true,
        processedAt: new Date(),
        error: null,
      },
    });

    return { status: "processed", eventId: event.id };
  } catch (error: any) {
    logger.error("Failed to process Stripe webhook event", error, { eventId: event.id });
    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: { error: error.message },
    });
    throw error;
  }
}

/**
 * Dispatches and executes specific event transitions.
 */
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planTier = (session.metadata?.planTier as SubscriptionPlanTier) || "free";
      const billingInterval = (session.metadata?.billingInterval as SubscriptionBillingInterval) || "month";

      if (!userId) break;

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id;

      // Upsert user subscription
      await prisma.$transaction(async (tx) => {
        // Find existing subscription or create new
        const existing = await tx.subscription.findFirst({
          where: { userId },
        });

        if (existing) {
          await tx.subscription.update({
            where: { id: existing.id },
            data: {
              planTier,
              status: "active",
              providerCustomerId: (session.customer as string) || null,
              providerSubscriptionId: subscriptionId || null,
              billingInterval,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(
                Date.now() + (billingInterval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000
              ),
              cancelAtPeriodEnd: false,
              endedAt: null,
            },
          });
        } else {
          await tx.subscription.create({
            data: {
              userId,
              planTier,
              status: "active",
              providerCustomerId: (session.customer as string) || null,
              providerSubscriptionId: subscriptionId || null,
              billingInterval,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(
                Date.now() + (billingInterval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000
              ),
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "subscription:created",
            targetEntity: "subscriptions",
            targetId: subscriptionId || userId,
            details: { planTier, billingInterval, sessionId: session.id },
          },
        });
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = typeof (invoice as any).subscription === "string" ? (invoice as any).subscription : (invoice as any).subscription?.id;
      if (!subId) break;

      const sub = await prisma.subscription.findUnique({
        where: { providerSubscriptionId: subId },
      });

      if (sub) {
        await prisma.$transaction(async (tx) => {
          // Update subscription period and active status
          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              status: "active",
              currentPeriodStart: new Date(((invoice as any).period_start || Date.now() / 1000) * 1000),
              currentPeriodEnd: new Date(((invoice as any).period_end || (Date.now() / 1000 + 30 * 86400)) * 1000),
            },
          });

          // Create payment invoice record
          await tx.paymentInvoice.create({
            data: {
              userId: sub.userId,
              subscriptionId: sub.id,
              providerInvoiceId: invoice.id,
              providerPaymentIntentId: (invoice as any).payment_intent as string | null,
              amountCents: invoice.amount_paid || 0,
              currency: invoice.currency || "usd",
              status: "succeeded",
              receiptUrl: (invoice as any).hosted_invoice_url || null,
              hostedInvoiceUrl: (invoice as any).hosted_invoice_url || null,
              billingReason: (invoice as any).billing_reason || "subscription_cycle",
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: sub.userId,
              action: "invoice:payment_succeeded",
              targetEntity: "payment_invoices",
              targetId: invoice.id,
              details: { amountPaid: invoice.amount_paid, currency: invoice.currency },
            },
          });
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = typeof (invoice as any).subscription === "string" ? (invoice as any).subscription : (invoice as any).subscription?.id;
      if (!subId) break;

      const sub = await prisma.subscription.findUnique({
        where: { providerSubscriptionId: subId },
      });

      if (sub) {
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { status: "past_due" },
          });

          await tx.paymentInvoice.create({
            data: {
              userId: sub.userId,
              subscriptionId: sub.id,
              providerInvoiceId: invoice.id,
              amountCents: invoice.amount_due || 0,
              currency: invoice.currency || "usd",
              status: "failed",
              billingReason: (invoice as any).billing_reason || "subscription_cycle",
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: sub.userId,
              action: "invoice:payment_failed",
              targetEntity: "payment_invoices",
              targetId: invoice.id,
              details: { amountDue: invoice.amount_due },
            },
          });
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const sub = await prisma.subscription.findUnique({
        where: { providerSubscriptionId: stripeSub.id },
      });

      if (sub) {
        const statusMap: Record<string, SubscriptionStatus> = {
          active: "active",
          past_due: "past_due",
          canceled: "canceled",
          unpaid: "unpaid",
          trialing: "trialing",
          paused: "paused",
        };

        const updatedStatus = statusMap[stripeSub.status] || "active";
        const cancelAtPeriodEnd = (stripeSub as any).cancel_at_period_end || false;

        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: updatedStatus,
            cancelAtPeriodEnd,
            canceledAt: (stripeSub as any).canceled_at ? new Date((stripeSub as any).canceled_at * 1000) : null,
            currentPeriodStart: (stripeSub as any).current_period_start
              ? new Date((stripeSub as any).current_period_start * 1000)
              : sub.currentPeriodStart,
            currentPeriodEnd: (stripeSub as any).current_period_end
              ? new Date((stripeSub as any).current_period_end * 1000)
              : sub.currentPeriodEnd,
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const sub = await prisma.subscription.findUnique({
        where: { providerSubscriptionId: stripeSub.id },
      });

      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "canceled",
            planTier: "free",
            endedAt: new Date(),
          },
        });

        await prisma.auditLog.create({
          data: {
            actorId: sub.userId,
            action: "subscription:deleted",
            targetEntity: "subscriptions",
            targetId: sub.id,
            details: { previousTier: sub.planTier },
          },
        });
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const invoiceId = (charge as any).invoice as string | null;

      if (invoiceId) {
        await prisma.paymentInvoice.updateMany({
          where: { providerInvoiceId: invoiceId },
          data: {
            status: "refunded",
            refundedAmountCents: charge.amount_refunded || 0,
            refundReason: (charge as any).refunds?.data?.[0]?.reason || "Customer requested refund",
          },
        });
      }
      break;
    }

    default:
      break;
  }
}

/**
 * Cancels a member's active subscription at period end (or immediately if specified).
 */
export async function cancelMemberSubscription(userId: string, immediate = false) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
  });

  if (!sub) throw new Error("No active subscription found to cancel.");

  if (sub.providerSubscriptionId) {
    if (immediate) {
      await stripe.subscriptions.cancel(sub.providerSubscriptionId);
    } else {
      await stripe.subscriptions.update(sub.providerSubscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      cancelAtPeriodEnd: !immediate,
      status: immediate ? "canceled" : "active",
      planTier: immediate ? "free" : sub.planTier,
      canceledAt: new Date(),
      endedAt: immediate ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: immediate ? "subscription:canceled_immediate" : "subscription:cancel_scheduled",
      targetEntity: "subscriptions",
      targetId: sub.id,
      details: { immediate },
    },
  });

  return updated;
}

/**
 * Retrieves the user's current subscription record.
 */
export async function getMemberSubscription(userId: string) {
  return await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a user's payment invoice history.
 */
export async function getMemberInvoices(userId: string) {
  return await prisma.paymentInvoice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
