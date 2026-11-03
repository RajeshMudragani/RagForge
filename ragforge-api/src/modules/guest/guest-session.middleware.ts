import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";
import { UnauthorizedError } from "../../common/errors/index.js";
import { GuestSessionService } from "./guest-session.service.js";

const guestSessions = new GuestSessionService();

export interface GuestRequest extends AuthenticatedRequest {
    guestSessionId?: string;
}

export const guestSessionMiddleware = async (
    req: GuestRequest,
    _res: Response,
    next: NextFunction,
) => {
    try {
        const authorization = req.headers.authorization;
        const token = authorization?.startsWith("Bearer ")
            ? authorization.slice("Bearer ".length).trim()
            : "";
        if (!token) throw new UnauthorizedError("Guest session is required");

        const session = await guestSessions.findActiveSession(token);
        if (!session) throw new UnauthorizedError("Guest session expired. Start a new trial.");

        req.guestSessionId = session.id;
        req.tenantId = session.id;
        next();
    } catch (error) {
        next(error);
    }
};
