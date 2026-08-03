export type WebhookEventType = "payment.succeeded" | "payment.failed";

export interface PaymentData {
  organizationId: string;
  subscriptionId: string;
  amountInCents: number;
}

export interface PaymentWebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: string;
  data: PaymentData;
}
