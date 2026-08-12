import { Router } from "express";
import { authenticate } from "@/middleware/authenticate";
import { generateInvoiceHandler, getInvoiceHandler, listInvoicesHandler } from "./invoice.controller";

export const invoiceRouter = Router();

invoiceRouter.post("/generate", authenticate, generateInvoiceHandler);
invoiceRouter.get("/:id", authenticate, getInvoiceHandler);
invoiceRouter.get("/", authenticate, listInvoicesHandler);