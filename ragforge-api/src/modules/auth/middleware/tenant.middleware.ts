import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface.js";
import { UnauthorizedError } from "../../../common/errors/index.js";

export const tenantMiddleware = (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
) => {

    if (!req.user?.tenantId) {
        return next(
            new UnauthorizedError(
                "Tenant context missing",
            ),
        );
    }

    req.tenantId = req.user.tenantId;

    next();
};