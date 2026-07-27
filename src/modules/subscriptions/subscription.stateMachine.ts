export type subscriptionStatus =
  "TRIALING" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";

const ALLOWED_TRANSACTIONS: Record<subscriptionStatus, subscriptionStatus[]> = {
  TRIALING: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PAST_DUE", "CANCELLED"],
  PAST_DUE: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  CANCELLED: [],
};

export function canTransition(
  from: subscriptionStatus,
  to: subscriptionStatus,
): boolean {
  return ALLOWED_TRANSACTIONS[from].includes(to);
}

export function assertValidTransition(
  from: subscriptionStatus,
  to: subscriptionStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid subscription status transition: ${from} -> ${to}`);
  }
}
