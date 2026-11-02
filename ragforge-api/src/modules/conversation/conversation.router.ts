import { Router } from "express";
import { ConversationController } from "./conversation.controller.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { tenantMiddleware } from "../auth/middleware/tenant.middleware.js";

const router = Router();

const controller = new ConversationController();

router.use(
    authMiddleware,
    tenantMiddleware,
)

router.get("/", controller.getConversations);

router.get("/:id", controller.getConversationById);

router.patch("/:id", controller.renameConversation);

router.delete("/:id", controller.deleteConversation);

export default router;