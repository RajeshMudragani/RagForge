import { Router } from "express";
import { DocumentSummaryController } from "./document-summary.controller.js";

const router = Router();

const controller = new DocumentSummaryController();

router.get("/:documentId/summary", controller.getSummary);

router.post("/:documentId/summary/regenerate", controller.regenerateSummary);

export default router;