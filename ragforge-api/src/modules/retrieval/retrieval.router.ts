import { Router } from "express";
import { RetrievalController } from "./retrieval.controller.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { tenantMiddleware } from "../auth/middleware/tenant.middleware.js";

const router = Router();

const controller = new RetrievalController();

router.use(
    authMiddleware,
    tenantMiddleware,
);

router.post("/search", controller.search);
router.post("/context", controller.context);

export default router;