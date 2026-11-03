import api from "./client";
import type { Collection, CollectionStats, ApiResponse } from "../types";

export const collectionsApi = {
    list: () =>
        api.get<ApiResponse<{ items: Collection[] }>>("/collections"),

    get: (id: string) =>
        api.get<ApiResponse<Collection>>(`/collections/${id}`),

    getStats: (id: string) =>
        api.get<ApiResponse<CollectionStats>>(`/collections/${id}/stats`),

    create: (name: string, description?: string) =>
        api.post<ApiResponse<{ id: string }>>("/collections", { name, description }),

    update: (id: string, data: { name?: string; description?: string | null }) =>
        api.patch<ApiResponse<{ updated: boolean }>>(`/collections/${id}`, data),

    delete: (id: string) =>
        api.delete(`/collections/${id}`),
};
