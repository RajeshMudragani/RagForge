import { Router } from "express";
import { DocumentSummaryController } from "./document-summary.controller.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { tenantMiddleware } from "../auth/middleware/tenant.middleware.js";

const router = Router();

const controller = new DocumentSummaryController();

router.get("/", authMiddleware, tenantMiddleware, controller.listForTenant);
router.get("/:documentId/summary", authMiddleware, tenantMiddleware, controller.getSummary);

router.post("/:documentId/summary/regenerate", authMiddleware, tenantMiddleware, controller.regenerateSummary);

export default router;