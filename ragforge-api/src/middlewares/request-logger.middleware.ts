import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { logger } from "../logger/logger.js";

export const requestLoggerMiddleware = pinoHttp({
    logger,

    genReqId: (req, res) => {
        const existingRequestId = req.headers["x-request-id"];

        const requestId =
            typeof existingRequestId === "string"
                ? existingRequestId
                : randomUUID();

        res.setHeader("x-request-id", requestId);

        return requestId;
    },
});