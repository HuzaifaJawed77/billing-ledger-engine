import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import {
  assertValidTransition,
  subscriptionStatus,
} from "./subscription.stateMachine";

function addInterval(date: Date, interval: "monthly" | "yearly"): Date {
  const result = new Date(date);
  if (interval === "monthly") {
    result.setMonth(result.getMonth() + 1);
  } else {
    result.setFullYear(result.getFullYear() + 1);
  }
  return result;
}

export async function subscribe(organizationId: string, planId: string) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.plan.findUnique({
      where: { id: planId },
    });
    if (!plan || !plan.isActive || plan.deletedAt) {
      throw new ApiError(404, "Plan not found or inactive");
    }
    const existing = await tx.subscription.findFirst({
      where: {
        organizationId,
        status: {
          in: ["ACTIVE", "TRIALING", "PAST_DUE"],
        },
      },
    });

    if (existing) {
      throw new ApiError(
        409,
        "Organization already has an active subscription",
      );
    }

    const now = new Date();
    const periodEnd = addInterval(
      now,
      plan.billingInterval as "monthly" | "yearly",
    );

    const subscription = await tx.subscription.create({
      data: {
        organizationId,
        planId,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return subscription;
  });
}

export async function getSubscriptionForOrg(
  organizationId: string,
  subscriptionId: string,
) {
  const subs = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      organizationId,
    },
    include: {
      plan: true,
    },
  });

  if (!subs) throw new ApiError(404, "Subscription not found");

  return subs;
}

export async function cancelSubscription(
  organizationId: string,
  subscriptionId: string,
  immediate: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findFirst({
      where: { id: subscriptionId, organizationId },
    });

    if (!sub) {
      throw new ApiError(404, "Subscription not found");
    }

    if (immediate) {
      assertValidTransition(sub.status as subscriptionStatus, "CANCELLED");

      return tx.subscription.update({
        where: { id: sub.id },
        data: { status: "CANCELLED" },
      });
    }

    // Cancel at period end — status stays ACTIVE, only the flag changes.
    // A background job (later phase) will flip status to CANCELLED
    // once currentPeriodEnd passes.
    if (sub.status !== "ACTIVE") {
      throw new ApiError(
        400,
        "Cancel-at-period-end is only allowed for active subscriptions",
      );
    }

    return tx.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });
  });
}

export async function transitionSubscriptionStatus(
  subscriptionId: string,
  newStatus: subscriptionStatus,
) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
    });

    assertValidTransition(sub.status as subscriptionStatus, newStatus);

    return tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: newStatus },
    });
  });
}
