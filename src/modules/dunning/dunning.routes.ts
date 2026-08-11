import { Router } from "express";
import { authenticate } from "@/middleware/authenticate";
import { requireRole } from "@/middleware/requireRole";
import { triggerDunningHandler } from "./dunning.controller";

export const dunningRouter = Router();

dunningRouter.post("/trigger", authenticate, requireRole("admin"), triggerDunningHandler);