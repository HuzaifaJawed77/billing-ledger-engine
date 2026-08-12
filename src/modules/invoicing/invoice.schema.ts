import { z } from "zod";

export const generateInvoiceSchema = z.object({
  subscriptionId: z.uuid(),
});