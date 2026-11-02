import { Router } from "express";
import { CollectionsController } from "./collections.controller.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { tenantMiddleware } from "../auth/middleware/tenant.middleware.js";

const router = Router();

const controller = new CollectionsController();

router.use(
    authMiddleware,
    tenantMiddleware,
);

router.post("/", controller.create);

router.get("/", controller.getAll);

router.get("/:id/stats", controller.getStats);

router.get("/:id", controller.getById);

router.patch("/:id", controller.update);

router.delete("/:id", controller.delete);

export default router;