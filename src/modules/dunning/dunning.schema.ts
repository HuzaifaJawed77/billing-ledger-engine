import { z } from "zod";

export const triggerDunningSchema = z.object({
  subscriptionId: z.uuid(),
  forceOutcome: z.enum(["succeed", "fail"]).optional(),
});

export type TriggerDunningInput = z.infer<typeof triggerDunningSchema>;
