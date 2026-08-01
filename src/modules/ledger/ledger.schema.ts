import { z } from "zod";

export const depositSchema = z.object({
  amountInCents: z
    .number()
    .int("Amount must be a whole number of cents")
    .positive("Amount must be greater than 0")
    .max(100_000_000, "Amount exceeds the maximum allowed deposit"),
});

export type DepositInput = z.infer<typeof depositSchema>;