import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@/middleware/authenticate";
import { ApiError } from "@/lib/apiError";
import { generateInvoiceSchema } from "./invoice.schema";
import {
  generateInvoice,
  getInvoiceById,
  listInvoicesForOrg,
} from "./invoice.service";

export async function generateInvoiceHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const input = generateInvoiceSchema.parse(req.body);
    const invoice = await generateInvoice(
      req.user.organizationId,
      input.subscriptionId,
    );
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}
export async function getInvoiceHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const { id } = req.params;
    const invoiceId = Array.isArray(id) ? id[0] : id;
    if (!invoiceId) throw new ApiError(400, "Invoice id is required");
    const invoice = await getInvoiceById(req.user.organizationId, invoiceId);
    res.status(200).json(invoice);
  } catch (err) {
    next(err);
  }
}
export async function listInvoicesHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const invoices = await listInvoicesForOrg(req.user.organizationId);
    res.status(200).json(invoices);
  } catch (err) {
    next(err);
  }
}
