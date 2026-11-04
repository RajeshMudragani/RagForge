import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: {
        target: "pino-pretty",
        options: {
            colorize: isDevelopment,
            translateTime: "yyyy-mm-dd, h:MM:ss TT",
            ignore: "pid,hostname",
        },
    },
});