import api from "./client";
import type { AuthTokens, User, ApiResponse } from "../types";

export const authApi = {
    login: (email: string, password: string) =>
        api.post<ApiResponse<AuthTokens>>("/auth/login", { email, password }),

    register: (email: string, password: string, firstName: string, lastName: string, tenantId?: string) =>
        api.post<ApiResponse<AuthTokens>>("/auth/register", { email, password, firstName, lastName, tenantId }),

    me: () =>
        api.get<ApiResponse<User>>("/auth/me"),

    refresh: (refreshToken: string) =>
        api.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }),

    logout: (refreshToken: string) =>
        api.post("/auth/logout", { refreshToken }),

    logoutAll: () =>
        api.post("/auth/logout-all"),
};
