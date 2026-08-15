import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import type { DunningJobData } from "@/modules/dunning/dunning.types";
import { redisConnection } from "@/lib/redisConnection";
import { scheduleDunningRetry, simulateRetryOutcome } from "./dunning.service";
import { MAX_DUNNING_ATTEMPTS } from "@/modules/dunning/dunning.types";
import { transitionSubscriptionStatus } from "@/modules/subscriptions/subscription.service";
import { logger } from "@/lib/logger";


async function processDunningJob(job: Job<DunningJobData>) {
  const { subscriptionId, attempt, forceOutcome } = job.data;
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!subscription) {
    return;
  }
  if (subscription.status !== "PAST_DUE") {
    return;
  }
  const outcome = simulateRetryOutcome(forceOutcome);
  if (outcome) {
    await transitionSubscriptionStatus(subscriptionId, "ACTIVE");
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { dunningAttempts: 0 },
    });
    return;
  }
  const nextAttempt = attempt + 1;
  if (nextAttempt > MAX_DUNNING_ATTEMPTS) {
    await transitionSubscriptionStatus(subscriptionId, "SUSPENDED");
    return;
  }
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { dunningAttempts: nextAttempt },
  });
  await scheduleDunningRetry(subscriptionId, nextAttempt,forceOutcome);
}

export const dunningWorker = new Worker<DunningJobData>(
  "dunning-retry",
  processDunningJob,
  { connection: redisConnection },
);
dunningWorker.on("completed", (job) => {
  logger.info({ jobId: job.id, subscriptionId: job.data.subscriptionId }, "Dunning job completed");
});

dunningWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Dunning job failed");
});