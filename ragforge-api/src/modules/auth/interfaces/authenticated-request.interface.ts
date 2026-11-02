import { Request } from "express";
import { JwtPayload } from "./jwt-payload.interface.js";

export interface AuthenticatedRequest<P = Record<string, string>> extends Request<P> {
    user?: JwtPayload;
    tenantId?: string;
}