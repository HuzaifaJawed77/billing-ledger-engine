import { Router } from "express";
import { authenticate } from "@/middleware/authenticate";
import { requireRole } from "@/middleware/requireRole";
import { dashboardHandler } from "./reporting.controller";

export const reportingRouter = Router();

reportingRouter.get("/platform-dashboard", authenticate, requireRole("admin"), dashboardHandler);