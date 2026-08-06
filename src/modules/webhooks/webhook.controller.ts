import { Response, NextFunction, Request } from "express";
import { AuthenticatedRequest } from "@/middleware/authenticate";
import { ApiError } from "@/lib/apiError";
import { simulatePaymentSchema } from "./webhook.schema";
import { generateSignedWebhookEvent } from "./paymentSimulator";
import { processWebhookEvent } from "./webhook.service";

export async function simulatePaymentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const input = simulatePaymentSchema.parse(req.body);
    const { payload, signature } = generateSignedWebhookEvent({
      eventType: input.eventType,
      organizationId: req.user.organizationId,
      subscriptionId: input.subscriptionId,
      amountInCents: input.amountInCents,
    });
    const result = await processWebhookEvent(payload, signature);
    res.status(200).json({ payload, signature, result });
  } catch (err) {
    next(err);
  }
}

export async function receiveWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { payload, signature } = req.body;
    if (!payload || !signature) {
      throw new ApiError(400, "Missing payload or signature");
    }
    const result = await processWebhookEvent(payload, signature);
    res.status(200).json({ result });
  } catch (err) {
    next(err);
  }
}
