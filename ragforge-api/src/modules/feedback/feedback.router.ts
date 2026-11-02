import { Router } from "express";
import { FeedbackController } from "./feedback.controller.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { tenantMiddleware } from "../auth/middleware/tenant.middleware.js";

const router = Router();

const controller = new FeedbackController();

router.use(
    authMiddleware,
    tenantMiddleware,
)

router.post("/", controller.create);

router.get("/", controller.findAll);

export default router;