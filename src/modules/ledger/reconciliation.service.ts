import { prisma } from "@/lib/prisma";

export async function runReconciliationCheck(): Promise<{
  balanced: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
}> {
  const result = await prisma.ledgerEntry.groupBy({
    by: ["type"],
    _sum: {
      amountInCents: true,
    },
  });
  const debitRow = result.find((row) => row.type === "DEBIT");
  const creditRow = result.find((row) => row.type === "CREDIT");

  const totalDebits = debitRow?._sum.amountInCents ?? 0;
  const totalCredits = creditRow?._sum.amountInCents ?? 0;

  const balanced = totalDebits === totalCredits;

  return {
    balanced,
    totalCredits,
    totalDebits,
    difference: totalDebits - totalCredits,
  };
}
