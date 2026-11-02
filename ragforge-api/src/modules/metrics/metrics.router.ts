import { Router } from "express";
import { MetricsController } from "./metrics.controller.js";

const router = Router();

const controller = new MetricsController();

router.get("/", controller.getMetrics);

export default router;