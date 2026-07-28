import { z } from "zod";
export const subscribeSchema = z.object({
  planId: z.string().uuid("Invalid plan ID"),
});

export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
});

export const changePlanSchema = z.object({
  newPlanId: z.string().uuid("Invalid plan ID"),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
