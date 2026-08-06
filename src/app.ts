import express from "express";
import { errorHandler } from "@/middleware/errorHandler";
import { authRouter } from "@/modules/auth/auth.routes";
import { planRouter } from "@/modules/plans/plans.routes";
import { subscriptionRouter } from "@/modules/subscriptions/subscription.routes";
import { ledgerRouter } from "@/modules/ledger/ledger.routes";
import {webhookRouter} from '@/modules/webhooks/webhook.routes';

export const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRouter);
app.use("/api/plans", planRouter);
app.use("/api/subscriptions", subscriptionRouter);
app.use("/api/ledger", ledgerRouter);
app.use("/api/webhooks", webhookRouter);

app.use(errorHandler);
