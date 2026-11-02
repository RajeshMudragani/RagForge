import rateLimit from "express-rate-limit";
import { env } from "../../config/env.config.js";


const defaultHandler = (
    _req: any,
    res: any,
) => {

    res.status(429).json({
        success: false,
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            message:
                "Too many requests. Please try again later.",
        },
    });
};

export const globalRateLimit = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
});

export const authRateLimit = rateLimit({
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: defaultHandler,
});

export const chatRateLimit = rateLimit({
    windowMs: env.CHAT_RATE_LIMIT_WINDOW_MS,
    max: env.CHAT_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: defaultHandler,
});

export const evaluationRateLimit = rateLimit({
    windowMs: env.EVALUATION_RATE_LIMIT_WINDOW_MS,
    max: env.EVALUATION_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: defaultHandler,
});


export const uploadRateLimit = rateLimit({
    windowMs: env.UPLOAD_RATE_LIMIT_WINDOW_MS,
    max: env.UPLOAD_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: defaultHandler,
});