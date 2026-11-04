export interface AuthResponse {
    accessToken: string;
    refreshToken: string;

    user: {
        sub: string;
        email: string;
        role: string;
        tenantId: string | null;
        name: string;
    };
}