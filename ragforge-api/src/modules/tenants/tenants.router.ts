import { Router } from "express";
import { TenantsController } from "./tenants.controller.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { requireRole } from "../auth/middleware/role.middleware.js";
import { UserRole } from "../users/users.constants.js";

const router = Router();

const controller = new TenantsController();

router.use(
    authMiddleware,
    requireRole(UserRole.ADMIN),
);

router.post("/", controller.create);

router.get("/", controller.findAll);

router.get("/:id", controller.findById);

router.patch("/:id", controller.update);

router.delete("/:id", controller.delete);

export default router;