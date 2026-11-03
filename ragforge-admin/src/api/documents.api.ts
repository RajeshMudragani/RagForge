import api from "./client";
import type { Document, DocumentSummaryItem, ApiResponse } from "../types";

export const documentsApi = {
    upload: (
        file: File,
        options?: { collectionName?: string; metadata?: Record<string, string> },
        onProgress?: (pct: number) => void,
    ) => {
        const form = new FormData();
        form.append("file", file);
        if (options?.collectionName) form.append("collectionName", options.collectionName);
        if (options?.metadata) form.append("metadata", JSON.stringify(options.metadata));
        return api.post<ApiResponse<Document>>("/documents/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 5 * 60 * 1000, // 5 min for large files
            onUploadProgress: (e) => {
                if (onProgress && e.total) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            },
        });
    },

    getEventsUrl: () => (import.meta.env.VITE_API_URL ?? "/api/v1") + "/documents/events",

    list: () =>
        api.get<ApiResponse<Document[]>>("/documents"),

    listSummaries: () =>
        api.get<ApiResponse<DocumentSummaryItem[]>>("/document-summary"),

    get: (id: string) =>
        api.get<ApiResponse<Document>>(`/documents/${id}`),

    update: (id: string, data: { filename?: string; collectionId?: string | null }) =>
        api.patch<ApiResponse<Document>>(`/documents/${id}`, data),

    delete: (id: string) =>
        api.delete<ApiResponse<{ deleted: boolean }>>(`/documents/${id}`),

    getStatus: (id: string) =>
        api.get<ApiResponse<{ status: string; progress?: number }>>(`/documents/${id}/status`),

    assignCollection: (documentIds: string[], collectionId: string | null) =>
        api.patch<ApiResponse<{ updated: number }>>("/documents/assign-collection", { documentIds, collectionId }),

    process: (id: string) =>
        api.post<ApiResponse<{ documentId: string; chunksCreated: number; status: string }>>(`/documents/${id}/process`),

    regenerateSummary: (id: string) =>
        api.post<ApiResponse<{ documentId: string; summaryStatus: "PENDING" }>>(`/document-summary/${id}/summary/regenerate`),
};
