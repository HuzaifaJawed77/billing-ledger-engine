import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import type { CreatePlanInput, UpdatePlanInput } from "./plans.schema";

export async function createPlan(input: CreatePlanInput) {
  const existing = await prisma.plan.findFirst({
    where: { name: input.name, deletedAt: null },
  });
  if (existing) {
    throw new ApiError(409, "An active plan with this name already exists");
  }
  return prisma.plan.create({
    data: input,
  });
}

export async function listActivePlans() {
  return prisma.plan.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { priceInCents: "asc" },
  });
}

export async function getPlanById(planId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, deletedAt: null },
  });
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }
  return plan;
}

export async function updatePlan(planId: string, updates: UpdatePlanInput) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, deletedAt: null },
  });
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }
  if (updates.name) {
    const existing = await prisma.plan.findFirst({
      where: { name: updates.name, deletedAt: null, NOT: { id: planId } },
    });

    if (existing) {
      throw new ApiError(409, "An active plan with this name already exists");
    }
  }
  return prisma.plan.update({
    where: { id: planId },
    data: updates,
  });
}

export async function deletePlan(planId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, deletedAt: null },
  });
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  const activeSubscriptions = await prisma.subscription.count({
    where: {
      planId,
      status: {
        in: ["ACTIVE", "TRIALING", "PAST_DUE"],
      },
    },
  });

  if (activeSubscriptions > 0) {
    throw new ApiError(409,"Cannot delete a plan with active subscriptions. Deactivate it instead.");
  }

  return prisma.plan.update({
    where: { id: planId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
}
