import { Router } from "express";
import { EvaluationController } from "./evaluation.controller.js";
import { tenantMiddleware } from "../auth/middleware/tenant.middleware.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { evaluationRateLimit } from "../../common/middleware/rate-limit.middleware.js";

const router = Router();

const controller = new EvaluationController();

router.use(
    authMiddleware,
    tenantMiddleware,
)

router.post("/run", evaluationRateLimit, controller.run);

router.get("/history", controller.history);

export default router;
