export interface DocumentSummaryResponse {
    documentId: string;
    summary: string;
    shortSummary: string | null;
    keyTopics: string[];
    keywords: string[];
    createdAt: Date;
    updatedAt: Date;
}