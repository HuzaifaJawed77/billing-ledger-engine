import { Request, Response, NextFunction } from "express";
import { createPlanSchema, updatePlanSchema } from "./plans.schema";
import * as planService from "./plans.service";
import { AuthenticatedRequest } from "@/middleware/authenticate";
import { ApiError } from "@/lib/apiError";

export async function createPlanHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = createPlanSchema.parse(req.body);

    const plan = await planService.createPlan(input);

    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
}

export async function listPlansHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const plans = await planService.listActivePlans();

    res.status(200).json(plans);
  } catch (err) {
    next(err);
  }
}

export async function getPlanHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = req.params.id;

    if (typeof id !== "string") {
      return next(new ApiError(400, "Invalid plan id"));
    }

    if (!id) {
      return next(new ApiError(400, "Plan id is required"));
    }

    const plan = await planService.getPlanById(id);

    res.status(200).json(plan);
  } catch (err) {
    next(err);
  }
}

export async function updatePlanHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = req.params.id;

    if (typeof id !== "string") {
      return next(new ApiError(400, "Invalid plan id"));
    }
    if (!id) {
      return next(new ApiError(400, "Plan id is required"));
    }

    const input = updatePlanSchema.parse(req.body);

    const plan = await planService.updatePlan(id, input);

    res.status(200).json(plan);
  } catch (err) {
    next(err);
  }
}

export async function deletePlanHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = req.params.id;

    if (typeof id !== "string") {
      return next(new ApiError(400, "Invalid plan id"));
    }
    if (!id) {
      return next(new ApiError(400, "Plan id is required"));
    }

    await planService.deletePlan(id);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
