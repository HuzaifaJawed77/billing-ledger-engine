import { Response, NextFunction } from "express";
import {
  subscribeSchema,
  cancelSubscriptionSchema,
} from "./subscription.schema";
import * as subscriptionService from "./subscription.service";
import { AuthenticatedRequest } from "@/middleware/authenticate";
import { ApiError } from "@/lib/apiError";

export async function subscribeHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const input = subscribeSchema.parse(req.body);
    const subscription = await subscriptionService.subscribe(
      req.user.organizationId,
      input.planId,
    );
    res.status(201).json(subscription);
  } catch (err) {
    next(err);
  }
}

export async function getSubscriptionHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      throw new ApiError(400, "Invalid subscription id");
    }
    const subscription = await subscriptionService.getSubscriptionForOrg(
      req.user.organizationId,
      id,
    );
    res.status(200).json(subscription);
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscriptionHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      throw new ApiError(400, "Invalid subscription id");
    }
    const input = cancelSubscriptionSchema.parse(req.body);

    const subscription = await subscriptionService.cancelSubscription(
      req.user.organizationId,
      id,
      input.immediate,
    );

    res.status(200).json(subscription);
  } catch (err) {
    next(err);
  }
}
