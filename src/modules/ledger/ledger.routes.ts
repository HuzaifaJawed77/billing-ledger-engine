import { Router } from "express";
import { authenticate } from "@/middleware/authenticate";
import { requireRole } from "@/middleware/requireRole";
import {
  depositHandler,
  getBalanceHandler,
  getHistoryHandler,
  reconciliationHandler,
} from "./ledger.controller";

export const ledgerRouter = Router();
ledgerRouter.post("/deposit", authenticate, depositHandler);
ledgerRouter.get("/balance", authenticate, getBalanceHandler);
ledgerRouter.get("/history", authenticate, getHistoryHandler);

// admin-only, system-wide check — not scoped to one org
ledgerRouter.get("/reconciliation", authenticate, requireRole("admin"), reconciliationHandler);