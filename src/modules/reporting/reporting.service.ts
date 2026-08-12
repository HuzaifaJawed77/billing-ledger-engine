import { prisma } from "@/lib/prisma";

// Calculates monthly recurring revenue from ACTIVE subscriptions.
// Yearly plans are normalized to their monthly equivalent.
export async function calculateMRR(): Promise<number> {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { plan: true },
  });

  return subscriptions.reduce((total, subscription) => {
    const { priceInCents, billingInterval } = subscription.plan;

    if (billingInterval === "yearly") {
      return total + Math.round(priceInCents / 12);
    }

    return total + priceInCents;
  }, 0);
}

// Returns the number of subscriptions for each status.
export async function getSubscriptionStatusBreakdown() {
  const result = await prisma.subscription.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return result.reduce(
    (acc, row) => {
      acc[row.status] = row._count.status;
      return acc;
    },
    {} as Record<string, number>,
  );
}

// Calculates the ratio of subscriptions with payment issues.
export async function getFailedPaymentRate(): Promise<number> {
  const totalSubscriptions = await prisma.subscription.count();

  if (totalSubscriptions === 0) return 0;

  const failedPayments = await prisma.subscription.count({
    where: {
      status: {
        in: ["PAST_DUE", "SUSPENDED"],
      },
    },
  });

  return failedPayments / totalSubscriptions;
}

// Combines all dashboard metrics into a single response.
export async function getDashboardMetrics() {
  const [mrr, subscriptionBreakdown, failedPaymentRate] =
    await Promise.all([
      calculateMRR(),
      getSubscriptionStatusBreakdown(),
      getFailedPaymentRate(),
    ]);

  return {
    mrrInCents: mrr,
    subscriptionByStatus: subscriptionBreakdown,
    failedPaymentRate: Math.round(failedPaymentRate * 100) / 100,
  };
}