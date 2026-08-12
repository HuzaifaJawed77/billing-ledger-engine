import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";

async function generateInvoiceNumber(): Promise<string>{
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
        where:{invoiceNumber:{startsWith:`INV-${year}-`}},
    });
    const nextNumber = (count + 1).toString().padStart(5,"0");
  return `INV-${year}-${nextNumber}`;

}

export async function generateInvoice(organizationId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, organizationId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      subscriptionId,
      invoiceNumber,
      totalAmountInCents: subscription.plan.priceInCents,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      status: subscription.status === "ACTIVE" ? "PAID" : "UNPAID",
      lineItems: {
        create: [
          {
            description: `${subscription.plan.name} Plan — ${subscription.plan.billingInterval}`,
            amountInCents: subscription.plan.priceInCents,
          },
        ],
      },
    },
    include: { lineItems: true },
  });

  return invoice;
}

export async function getInvoiceById(organizationId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: { lineItems: true },
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  return invoice;
}

export async function listInvoicesForOrg(organizationId: string) {
  return prisma.invoice.findMany({
    where: { organizationId },
    include: { lineItems: true },
    orderBy: { issuedAt: "desc" },
  });
}