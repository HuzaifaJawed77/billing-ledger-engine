import { createHmac, randomUUID } from "crypto";

import { env } from "@/config/env";
import type { PaymentWebhookPayload, WebhookEventType } from "./webhook.types";

const HMAC_ALGORITHM = "sha256";

export function generateSignedWebhookEvent(params: {
  eventType: WebhookEventType;
  organizationId: string;
  subscriptionId: string;
  amountInCents: number;
}): {
  payload: PaymentWebhookPayload;
  signature: string;
} {
  const { eventType, organizationId, subscriptionId, amountInCents } = params;

  const payload: PaymentWebhookPayload = {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    data: {
      organizationId,
      subscriptionId,
      amountInCents,
    },
  };

  return {
    payload,
    signature: signPayload(payload),
  };
}

export function signPayload(payload: PaymentWebhookPayload): string {
  const serializedPayload = JSON.stringify(payload);

  return createHmac(HMAC_ALGORITHM, env.WEBHOOK_SECRET)
    .update(serializedPayload)
    .digest("hex");
}
