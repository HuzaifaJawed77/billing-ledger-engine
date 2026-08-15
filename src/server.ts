import {app} from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import "@/modules/dunning/dunning.worker";
import { logger } from "@/lib/logger";

async function start() {
  await prisma.$connect();

  console.log("Database connected");

  app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT}`);
  });
}

start();