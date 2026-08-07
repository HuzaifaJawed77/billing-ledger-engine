import { Queue } from "bullmq";
import { redisConnection } from "@/lib/redisConnection";
import type { DunningJobData } from "./dunning.types";

export const dunningQueue = new Queue<DunningJobData>("dunning-retry", {
  connection: redisConnection,
});
