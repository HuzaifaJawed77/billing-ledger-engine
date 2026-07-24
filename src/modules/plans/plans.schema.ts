import { z } from "zod";

export const createPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Plan name must be at least 2 characters")
    .max(100, "Plan name is too long"),

  priceInCents: z
    .number()
    .int()
    .nonnegative("Price cannot be negative"),

  billingInterval: z.enum(["monthly", "yearly"]),
});

export const updatePlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

  isActive: z.boolean().optional(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;