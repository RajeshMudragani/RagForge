import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { authRateLimit } from "../../common/middleware/rate-limit.middleware.js";

const router = Router();

const controller = new AuthController();

router.post("/register", controller.register);

router.post("/login", authRateLimit, controller.login);

router.get("/me", authMiddleware, controller.me);

router.post("/refresh", controller.refresh);

router.post("/logout", controller.logout);

router.post("/logout-all", authMiddleware, controller.logoutAll);

export default router;