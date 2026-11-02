export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    kid: string;
    typ: | "ACCESS" | "REFRESH";
    tenantId: string;
}