import { prisma } from "../src/lib/prisma";
async function main() {
  console.log("Seeding plans...");

  const plans = [
    {
      name: "Starter",
      priceInCents: 999, // $9.99
      billingInterval: "monthly",
    },
    {
      name: "Pro",
      priceInCents: 2999, // $29.99
      billingInterval: "monthly",
    },
    {
      name: "Enterprise",
      priceInCents: 9999, // $99.99
      billingInterval: "monthly",
    },
    {
      name: "Pro Yearly",
      priceInCents: 29999, // $299.99
      billingInterval: "yearly",
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({
      where: { name: plan.name, deletedAt: null },
    });

    if (existing) {
      console.log(`Skipping "${plan.name}" — already exists`);
      continue;
    }

    const created = await prisma.plan.create({ data: plan });
    console.log(`Created plan: ${created.name} (${created.id})`);
  }

  console.log("Seeding complete.");
}
main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
