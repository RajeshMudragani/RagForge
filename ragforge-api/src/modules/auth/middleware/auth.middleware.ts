import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface.js";
import { JwtPayload } from "../interfaces/jwt-payload.interface.js";
import { AuthKeyService } from "../auth_key/auth-key.service.js";
import { UnauthorizedError } from "../../../common/errors/index.js";

export const authMiddleware = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
) => {

    try {

        // Support token via query param for EventSource (which can't set headers)
        const authorization = req.headers.authorization
            ?? (req.query.token ? `Bearer ${req.query.token}` : undefined);

        if (!authorization) {
            throw new UnauthorizedError(
                "Authorization header missing",
            );
        }

        const token = authorization.replace(
            "Bearer ",
            "",
        );

        const decoded = jwt.decode(
            token,
            { complete: true },
        );

        if (
            !decoded ||
            typeof decoded === "string"
        ) {
            throw new UnauthorizedError(
                "Invalid token",
            );
        }

        const kid = decoded.header.kid;
        const authKeyService = new AuthKeyService();

        const key = await authKeyService.findByKid(String(kid));

        if (
            !key
        ) {
            throw new UnauthorizedError(
                "Invalid signing key",
            );
        }

        const payload = jwt.verify(
                token,
                key.publicKey,
                {
                    algorithms: ["RS256"],
                },
            ) as JwtPayload;

        req.user = payload;

        next();

    } catch (error) {
        next(error);
    }
};