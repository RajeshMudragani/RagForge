import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../logger/logger.js";
import { AppError } from "../common/errors/index.js";
import { HTTP_STATUS, ERROR_CODES } from "../constants/http.constants.js";

export const errorsMiddleware = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    if (res.headersSent) return;

    if (err instanceof ZodError) {
        res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
            success: false,
            error: {
                code: ERROR_CODES.VALIDATION_ERROR,
                message: "Validation failed",
                details: err.issues,
            },
        });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
            },
        });
        return;
    }

    logger.error({ err, method: req.method, url: req.originalUrl });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: "Internal server error.",
        },
    });
};
