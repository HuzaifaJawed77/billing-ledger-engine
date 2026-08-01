import { Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { AuthenticatedRequest } from "@/middleware/authenticate";
import { ApiError } from "@/lib/apiError";
import { depositSchema } from "./ledger.schema";
import { recordTransaction, getTransactionHistory } from "./ledger.service";
import { getOrCreateAccount, getBalance } from "./account.service";
import { runReconciliationCheck } from "./reconciliation.service";

export async function depositHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const input = depositSchema.parse(req.body);
    const organizationId = req.user.organizationId;

    const walletAccount = await getOrCreateAccount(organizationId, "WALLET");
    const platformAccount = await getOrCreateAccount(
      organizationId,
      "PLATFORM",
    );

    const transaction = await recordTransaction({
      organizationId,
      type: "DEPOSIT",
reference: `deposit:${organizationId}:${Date.now()}`,
      idempotencyKey: randomUUID(),
      debitAccountId: platformAccount.id, // Platform account loses value (debit)
      creditAccountId: walletAccount.id, // Wallet account receives value (credit)
      amountInCents: input.amountInCents,
    });

    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
}
export async function getBalanceHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const walletAccount = await getOrCreateAccount(
      req.user.organizationId,
      "WALLET",
    );
    const balanceInCents = await getBalance(walletAccount.id);

    res.status(200).json({ accountId: walletAccount.id, balanceInCents });
  } catch (err) {
    next(err);
  }
}

export async function getHistoryHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const history = await getTransactionHistory(req.user.organizationId);
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
}

export async function reconciliationHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }
    const result = await runReconciliationCheck();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
