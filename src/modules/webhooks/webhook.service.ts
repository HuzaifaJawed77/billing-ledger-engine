import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";

import { signPayload } from "./paymentSimulator";
import type { PaymentWebhookPayload } from "./webhook.types";

import { recordTransaction } from "@/modules/ledger/ledger.service";
import { getOrCreateAccount } from "@/modules/ledger/account.service";
import { transitionSubscriptionStatus } from "@/modules/subscriptions/subscription.service";

const MAX_EVENT_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verifies that a payload was signed with our shared secret.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifySignature(
  payload: PaymentWebhookPayload,
  incomingSignature: string,
): boolean {
  const expectedSignature = signPayload(payload);

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const incomingBuffer = Buffer.from(incomingSignature, "hex");

  if (expectedBuffer.length !== incomingBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, incomingBuffer);
}

function isEventStale(timestamp: string): boolean {
  const eventTime = new Date(timestamp).getTime();
  const age = Date.now() - eventTime;

  return age > MAX_EVENT_AGE_MS;
}

/**
 * Processes an incoming webhook:
 * 1. Verify signature
 * 2. Reject stale events
 * 3. Enforce idempotency
 * 4. Apply business logic
 */
export async function processWebhookEvent(
  payload: PaymentWebhookPayload,
  signature: string,
) {
  if (!verifySignature(payload, signature)) {
    throw new ApiError(401, "Invalid webhook signature");
  }

  if (isEventStale(payload.timestamp)) {
    throw new ApiError(400, "Webhook event is too old to process");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.processedWebhookEvent.create({
        data: {
          eventId: payload.eventId,
          eventType: payload.eventType,
        },
      });

      if (payload.eventType === "payment.succeeded") {
        await handlePaymentSucceeded(payload, tx);
        return;
      }

      if (payload.eventType === "payment.failed") {
        await handlePaymentFailed(payload, tx);
      }
    });
  } catch (err: any) {
  console.log("DEBUG ERROR CODE:", err?.code);
  console.log("DEBUG ERROR META:", JSON.stringify(err?.meta));
  
  if (err?.code === "P2002") {
    return { status: "already_processed" };
  }
  throw err;
}

  return { status: "processed" };
}

async function handlePaymentSucceeded(
  payload: PaymentWebhookPayload,
  tx: any,
) {
  const { organizationId, amountInCents } = payload.data;

  const walletAccount = await getOrCreateAccount(organizationId, "WALLET");
  const platformAccount = await getOrCreateAccount(
    organizationId,
    "PLATFORM",
  );

  await recordTransaction({
    organizationId,
    type: "CHARGE",
    reference: `webhook-${payload.eventId}`,
    idempotencyKey: payload.eventId,
    debitAccountId: walletAccount.id,
    creditAccountId: platformAccount.id,
    amountInCents,
  });
}

async function handlePaymentFailed(
  payload: PaymentWebhookPayload,
  tx: any,
) {
  const { subscriptionId } = payload.data;

  await transitionSubscriptionStatus(subscriptionId, "PAST_DUE");
}