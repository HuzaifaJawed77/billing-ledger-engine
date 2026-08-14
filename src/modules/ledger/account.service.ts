import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { AccountType } from "./ledger.types";

export async function getOrCreateAccount(
  organizationId: string,
  type: AccountType,
  tx?:Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  return db.account.upsert({
    where: { organizationId_type: { organizationId, type } },
    update: {},
    create: {
      organizationId,
      type,
    },
  });
}

export async function getBalance(accountId: string): Promise<number> {
  const result = await prisma.ledgerEntry.groupBy({
    by: ["type"],
    where: { accountId },
    _sum: { amountInCents: true },
  });
  const credits =
    result.find((r) => r.type === "CREDIT")?._sum.amountInCents ?? 0;
  const debits =
    result.find((r) => r.type === "DEBIT")?._sum.amountInCents ?? 0;

  return credits - debits;
}
