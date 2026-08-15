import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";

import { signPayload } from "./paymentSimulator";
import type { PaymentWebhookPayload } from "./webhook.types";

import { recordTransaction } from "@/modules/ledger/ledger.service";
import { getOrCreateAccount } from "@/modules/ledger/account.service";
import { transitionSubscriptionStatus } from "@/modules/subscriptions/subscription.service";
import { scheduleDunningRetry } from "../dunning/dunning.service";

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
 * 4. Apply business logic atomically
 * 5. Trigger external side effects after commit
 */
export async function processWebhookEvent(
  payload: PaymentWebhookPayload,
  signature: string,
) {
  if (!verifySignature(payload, signature)) {
    logger.warn(
      { eventId: payload.eventId, eventType: payload.eventType },
      "Webhook signature verification failed",
    );
    throw new ApiError(401, "Invalid webhook signature");
  }

  if (isEventStale(payload.timestamp)) {
    logger.warn(
      { eventId: payload.eventId, timestamp: payload.timestamp },
      "Stale webhook event rejected",
    );
    throw new ApiError(400, "Webhook event is too old to process");
  }

  let shouldScheduleDunning = false;

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
        shouldScheduleDunning = await handlePaymentFailed(payload, tx);
      }
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      logger.info(
        { eventId: payload.eventId, eventType: payload.eventType },
        "Duplicate webhook event ignored",
      );
      return { status: "already_processed" };
    }

    logger.error(
      { eventId: payload.eventId, err },
      "Webhook processing failed unexpectedly",
    );
    throw err;
  }

  // Redis/BullMQ is an external side effect.
  // Only enqueue after the database transaction has committed.
  if (shouldScheduleDunning) {
    await scheduleDunningRetry(payload.data.subscriptionId, 1);
    logger.info(
      { subscriptionId: payload.data.subscriptionId },
      "Dunning retry scheduled after payment failure",
    );
  }

  logger.info(
    { eventId: payload.eventId, eventType: payload.eventType },
    "Webhook event processed successfully",
  );

  return { status: "processed" };
}

async function handlePaymentSucceeded(
  payload: PaymentWebhookPayload,
  tx: Prisma.TransactionClient,
) {
  const { organizationId, subscriptionId, amountInCents } = payload.data;

  const walletAccount = await getOrCreateAccount(organizationId, "WALLET", tx);

  const platformAccount = await getOrCreateAccount(
    organizationId,
    "PLATFORM",
    tx,
  );

  await recordTransaction(
    {
      organizationId,
      type: "CHARGE",
      reference: `webhook-${payload.eventId}`,
      idempotencyKey: payload.eventId,
      debitAccountId: walletAccount.id,
      creditAccountId: platformAccount.id,
      amountInCents,
    },
    tx,
  );

  const subscription = await tx.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (subscription && subscription.status === "PAST_DUE") {
    await transitionSubscriptionStatus(subscriptionId, "ACTIVE", tx);

    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        dunningAttempts: 0,
      },
    });

    logger.info(
      { subscriptionId },
      "Subscription recovered from PAST_DUE to ACTIVE",
    );
  }
}

async function handlePaymentFailed(
  payload: PaymentWebhookPayload,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  const { subscriptionId } = payload.data;

  await transitionSubscriptionStatus(subscriptionId, "PAST_DUE", tx);

  await tx.subscription.update({
    where: { id: subscriptionId },
    data: {
      dunningAttempts: 0,
    },
  });

  return true;
}