import { Router } from "express";
import { UsersController } from "./users.controller.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { requireRole } from "../auth/middleware/role.middleware.js";
import { UserRole } from "./users.constants.js";

const router = Router();

const controller = new UsersController();

router.post("/", authMiddleware, requireRole(UserRole.ADMIN), controller.create);

router.get("/", authMiddleware, requireRole(UserRole.ADMIN), controller.findAll);

router.get("/:id", authMiddleware, requireRole(UserRole.ADMIN), controller.findById);

router.patch("/:id", authMiddleware, requireRole(UserRole.ADMIN), controller.update);

router.delete("/:id", authMiddleware, requireRole(UserRole.ADMIN), controller.delete);

export default router;
