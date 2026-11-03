import { env } from "../../config/env.config.js";

export const DOCUMENT_STATUS = {
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    EMBEDDING: "EMBEDDING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
} as const;

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export const SUPPORTED_DOCUMENT_TYPES = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
    csv: "text/csv",
    html: "text/html",
    htm: "text/html",
    json: "application/json",
    xml: "application/xml",
    yaml: "application/yaml",
    yml: "application/yaml",
    tex: "application/x-tex",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    odt: "application/vnd.oasis.opendocument.text",
    odp: "application/vnd.oasis.opendocument.presentation",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    odg: "application/vnd.oasis.opendocument.graphics",
    rtf: "application/rtf",
    epub: "application/epub+zip",
} as const;

export const ALLOWED_MIME_TYPES = Object.values(SUPPORTED_DOCUMENT_TYPES);

export type SupportedDocumentExtension = keyof typeof SUPPORTED_DOCUMENT_TYPES;

export function getSupportedDocumentExtension(filename: string): SupportedDocumentExtension | null {
    const extension = filename.split(".").pop()?.toLowerCase();
    return extension && Object.hasOwn(SUPPORTED_DOCUMENT_TYPES, extension)
        ? extension as SupportedDocumentExtension
        : null;
}

export function getSupportedDocumentMimeType(filename: string): string | null {
    const extension = getSupportedDocumentExtension(filename);
    return extension ? SUPPORTED_DOCUMENT_TYPES[extension] : null;
}

export const UPLOAD_MAX_FILE_SIZE = env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

export const STORAGE_KEY_PREFIX = "documents";

export const DOCUMENT_PREVIEW_LENGTH = 1000;
