import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface.js";

export const requireRole = (
    ...roles: string[]
) => (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
) => {

    if (!req.user) {
        throw new Error(
            "Unauthorized",
        );
    }

    if (!roles.includes(req.user.role)) {
        throw new Error(
            "Forbidden",
        );
    }
    next();
};