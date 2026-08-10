export interface DunningJobData {
  subscriptionId: string;
  attempt: number;
  forceOutcome?: "succeed" | "fail";
}

export const MAX_DUNNING_ATTEMPTS = 3;

export const RETRY_DELAYS_MS = [
  10_000, // Retry #1 → 10 seconds
  30_000, // Retry #2 → 30 seconds
  60_000, // Retry #3 → 60 seconds
];
