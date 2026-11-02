import { Request, Response } from "express";
import { MetricsService } from "./metrics.service.js";

export class MetricsController {

    private readonly service = new MetricsService();

    getMetrics = async (
        _req: Request,
        res: Response,
    ) => {

        res.set(
            "Content-Type",
            "text/plain",
        );

        res.send(
            await this.service.getMetrics(),
        );
    };
}