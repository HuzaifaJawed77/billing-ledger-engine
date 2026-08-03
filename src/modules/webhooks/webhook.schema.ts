import { z } from "zod";

export const simulatePaymentSchema = z.object({
  eventType: z.enum(["payment.succeeded", "payment.failed"]),

  subscriptionId: z.string().uuid("Invalid subscription ID"),

  amountInCents: z
    .number()
    .int("Amount must be an integer")
    .positive("Amount must be greater than zero"),
});

export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
