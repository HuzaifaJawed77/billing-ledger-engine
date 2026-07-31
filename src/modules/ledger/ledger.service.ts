import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import type { TransactionType } from "./ledger.types";

interface RecordTransactionParams {
  organizationId: string;
  type: TransactionType;
  reference: string;
  idempotencyKey: string;
  debitAccountId: string;
  creditAccountId: string;
  amountInCents: number;
}

/**
 * Records a financial event as an atomic double-entry transaction.
 *
 * Guarantees:
 * - Debit and credit entries are written atomically.
 * - Duplicate idempotency keys are rejected.
 * - Ledger entries are immutable (append-only).
 * - Both accounts must exist and belong to the same organization.
 */
export async function recordTransaction(
  params: RecordTransactionParams,
) {
  const {
    organizationId,
    type,
    reference,
    idempotencyKey,
    debitAccountId,
    creditAccountId,
    amountInCents,
  } = params;

  if (amountInCents <= 0) {
    throw new ApiError(400, "Transaction amount must be positive");
  }

  if (debitAccountId === creditAccountId) {
    throw new ApiError(
      400,
      "Debit and credit accounts must be different",
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const accounts = await tx.account.findMany({
        where: {
          id: {
            in: [debitAccountId, creditAccountId],
          },
          organizationId,
        },
      });

      if (accounts.length !== 2) {
        throw new ApiError(
          404,
          "One or both accounts do not exist for this organization",
        );
      }

      const transaction = await tx.ledgerTransaction.create({
        data: {
          organizationId,
          type,
          reference,
          idempotencyKey,
        },
      });

      await tx.ledgerEntry.createMany({
        data: [
          {
            transactionId: transaction.id,
            accountId: debitAccountId,
            type: "DEBIT",
            amountInCents,
          },
          {
            transactionId: transaction.id,
            accountId: creditAccountId,
            type: "CREDIT",
            amountInCents,
          },
        ],
      });

      return tx.ledgerTransaction.findUnique({
        where: {
          id: transaction.id,
        },
        include: {
          entries: {
            include: {
              account: true,
            },
          },
        },
      });
    });
  } catch (err: any) {
    // Prisma unique constraint violation (idempotency key)
    if (
      err?.code === "P2002" &&
      Array.isArray(err?.meta?.target) &&
      err.meta.target.includes("idempotencyKey")
    ) {
      throw new ApiError(
        409,
        "Transaction has already been processed",
      );
    }

    throw err;
  }
}

export async function getTransactionHistory(
  organizationId: string,
) {
  return prisma.ledgerTransaction.findMany({
    where: {
      organizationId,
    },
    include: {
      entries: {
        include: {
          account: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}