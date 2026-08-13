import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@/middleware/authenticate";
import { getDashboardMetrics } from "./reporting.service";
import { ApiError } from "@/lib/apiError";

export async function dashboardHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const summary = await getDashboardMetrics();
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}
