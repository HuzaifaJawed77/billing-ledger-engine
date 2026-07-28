import { Router } from "express";
import { authenticate } from "@/middleware/authenticate";
import {subscribeHandler,getSubscriptionHandler,cancelSubscriptionHandler} from "./subscription.controller";

export const subscriptionRouter = Router();

subscriptionRouter.post("/subscribe", authenticate, subscribeHandler);
subscriptionRouter.get("/:id", authenticate, getSubscriptionHandler);
subscriptionRouter.post("/:id/cancel", authenticate, cancelSubscriptionHandler);