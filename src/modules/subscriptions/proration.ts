/* 
 Calculates the prorated amount when a subscription changes plans mid-cycle.
 
 Logic:
  - The unused portion of the current plan becomes a credit.
  - The new plan is charged only for the remaining time in the billing period.
  - Final amount due = Remaining cost of new plan - Unused credit from old plan.
 
  - All monetary values are represented in cents to avoid floating-point errors.
  - A negative amountDueInCents means the customer has a credit.
 */
import { ApiError } from "@/lib/apiError";


const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function calculateProration(params: {
  oldPriceInCents: number;
  newPriceInCents: number;
  periodStart: Date;
  periodEnd: Date;
  changeDate: Date;
}): {
  amountDueInCents: number;
  unusedCreditInCents: number;
  newPlanCostInCents: number;
  remainingDays: number;
} {
  const {
    oldPriceInCents,
    newPriceInCents,
    periodStart,
    periodEnd,
    changeDate,
  } = params;

  if (periodEnd <= periodStart) throw new ApiError(500, "Invalid billing period");
  if (changeDate < periodStart) throw new ApiError(400, "Change date cannot be before billing period start");

const totalPeriodDays = (periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY;
const remainingDays = Math.max(0 , (periodEnd.getTime() - changeDate.getTime()) / MS_PER_DAY);

const oldDailyRate = oldPriceInCents / totalPeriodDays;
const newDailyRate = newPriceInCents / totalPeriodDays;

const unusedCreditInCents = Math.round(oldDailyRate * remainingDays);
const newPlanCostInCents = Math.round(newDailyRate * remainingDays);

const amountDueInCents = newPlanCostInCents - unusedCreditInCents ;

return {amountDueInCents,
    unusedCreditInCents,
    newPlanCostInCents,
    remainingDays: Math.ceil(remainingDays),}

};




