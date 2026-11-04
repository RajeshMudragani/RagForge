import { Router } from "express";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { EmbeddingsController } from "./embeddings.controller.js";

const router = Router();
const controller = new EmbeddingsController();

router.use(authMiddleware);

router.post("/generate", controller.generate);

export default router;
