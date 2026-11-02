import { Router } from "express";
import { ChatController } from "./chat.controller.js";
import { chatRateLimit } from "../../common/middleware/rate-limit.middleware.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { tenantMiddleware } from "../auth/middleware/tenant.middleware.js";

const router = Router();

const controller = new ChatController();

router.use(
    authMiddleware,
    tenantMiddleware,
)

router.post("/", chatRateLimit, controller.chat);

router.post("/stream", chatRateLimit, controller.stream);

export default router;