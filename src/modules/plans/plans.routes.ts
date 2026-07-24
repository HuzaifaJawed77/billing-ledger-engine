import { Router } from "express";
import { authenticate } from "@/middleware/authenticate";
import { requireRole } from "@/middleware/requireRole";
import { createPlanHandler, listPlansHandler , getPlanHandler , updatePlanHandler , deletePlanHandler } from "./plans.controller";

export const planRouter = Router();

planRouter.get('/' , listPlansHandler);
planRouter.get('/:id' , getPlanHandler);

planRouter.post("/",authenticate,requireRole("admin"),createPlanHandler);
planRouter.patch("/:id",authenticate,requireRole("admin"),updatePlanHandler);
planRouter.delete("/:id",authenticate,requireRole("admin"),deletePlanHandler);