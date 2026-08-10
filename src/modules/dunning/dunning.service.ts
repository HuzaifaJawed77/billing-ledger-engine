import { dunningQueue } from "./dunning.queue";
import { RETRY_DELAYS_MS, type DunningJobData } from "./dunning.types";

function getDelayForAttempt(attempt: number): number {
  const delay = RETRY_DELAYS_MS[attempt];

  if (delay !== undefined) {
    return delay;
  }

  return RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
}

export async function scheduleDunningRetry(
  subscriptionId: string,
  attempt: number,
  forceOutcome?: "succeed" | "fail",
) {
  const delay = getDelayForAttempt(attempt);

  const jobData: DunningJobData = {
    subscriptionId,
    attempt,
    forceOutcome
  };

  await dunningQueue.add("retry-payment", jobData, {
    delay,
  });
}

export function simulateRetryOutcome(forceOutcome?: "succeed" | "fail") : boolean{
  if(forceOutcome ==="succeed") return true;
  if(forceOutcome ==="fail") return false;
  return Math.random() < 0.6;

}