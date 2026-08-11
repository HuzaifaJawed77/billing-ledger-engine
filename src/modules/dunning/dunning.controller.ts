import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@/middleware/authenticate";
import { ApiError } from "@/lib/apiError";
import { triggerDunningSchema } from "./dunning.schema";
import { scheduleDunningRetry } from "./dunning.service";

export async function triggerDunningHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const input = triggerDunningSchema.parse(req.body);
    await scheduleDunningRetry(input.subscriptionId, 1, input.forceOutcome);
    res.status(202).json({ message: "Dunning retry job enqueued" });
  } catch (error) {
    next(error);
  }
}
