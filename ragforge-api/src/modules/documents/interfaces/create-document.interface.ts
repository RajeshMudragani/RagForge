import { DocumentStatus } from "../documents.constants.js";

export interface CreateDocumentInput {
    tenantId: string,
    filename: string;
    mimeType: string;
    storageKey: string;
    status: DocumentStatus;
    metadata?: Record<string, unknown>;
    collectionId: string | null;
}