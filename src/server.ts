import {app} from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

async function start() {
  await prisma.$connect();

  console.log("Database connected");

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

start();