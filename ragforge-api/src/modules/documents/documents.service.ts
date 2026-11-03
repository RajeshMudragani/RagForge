import { randomUUID } from "node:crypto";
import { MinioService } from "../../storage/minio/minio.service.js";
import { DocumentsRepository } from "./documents.repository.js";
import { DOCUMENT_STATUS, STORAGE_KEY_PREFIX, getSupportedDocumentMimeType } from "./documents.constants.js";
import { BadRequestError, NotFoundError } from "../../common/errors/index.js";
import { CollectionsService } from "../collections/collections.service.js";
import { MetadataService } from "../metadata/metadata.service.js";
import { QueueService } from "../jobs/queue/queue.service.js";

export class DocumentsService {
    private readonly documentsRepository = new DocumentsRepository();
    private readonly minioService = new MinioService();
    private readonly collectionsService = new CollectionsService();
    private readonly metadataService = new MetadataService();
    private readonly queueService = new QueueService();

    async upload(
        file: Express.Multer.File,
        tenantId: string,
        collectionName?: string,
        metadata?: Record<string, string>,
    ) {

        let collectionId: string | null = null;

        if (
            collectionName &&
            collectionName.trim()
        ) {
            collectionId = await this.collectionsService.findOrCreate(tenantId, collectionName.trim());
        }

        const extension = file.originalname.split(".").pop();
        const mimeType = getSupportedDocumentMimeType(file.originalname);
        if (!mimeType) {
            throw new BadRequestError("Unsupported file type.");
        }
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");

        const storageKey = `${STORAGE_KEY_PREFIX}/${year}/${month}/${randomUUID()}.${extension}`;

        await this.minioService.uploadObject(
            storageKey,
            file.buffer,
            file.mimetype,
        );

        const document = await this.documentsRepository.create({
            tenantId,
            filename: file.originalname,
            mimeType,
            storageKey,
            status: DOCUMENT_STATUS.PENDING,
            metadata: {
                size: file.size,
            },
            collectionId,
        });

        await this.queueService.enqueueDocument({
            tenantId,
            documentId: document.id,
            storageKey,
            filename: file.originalname,
        });

        if (
            metadata &&
            Object.keys(metadata).length > 0
        ) {
            await this.metadataService.bulkAdd(
                document.id,
                metadata,
            );
        }

        return {
            ...document,
            status: DOCUMENT_STATUS.PENDING,
        };
    }

    async assignCollection(
        tenantId: string,
        documentIds: string[],
        collectionId: string | null,
    ) {
        return this.documentsRepository.assignCollection(tenantId, documentIds, collectionId);
    }

    async update(
        tenantId: string,
        documentId: string,
        data: {
            filename?: string;
            collectionId?: string | null;
        },
    ) {
        await this.findById(tenantId, documentId);

        if (data.collectionId) {
            const collection = await this.collectionsService.getById(tenantId, data.collectionId);
            if (!collection) {
                throw new NotFoundError("Collection");
            }
        }

        const document = await this.documentsRepository.update(tenantId, documentId, data);
        if (!document) {
            throw new NotFoundError("Document");
        }
        return document;
    }

    async delete(tenantId: string, documentId: string) {
        const document = await this.findById(tenantId, documentId);
        if (document.status === DOCUMENT_STATUS.PROCESSING || document.status === DOCUMENT_STATUS.EMBEDDING) {
            throw new BadRequestError("Wait for document processing to finish before deleting it.");
        }

        await this.minioService.removeObject(document.storageKey);
        const deleted = await this.documentsRepository.delete(tenantId, documentId);
        if (!deleted) {
            throw new NotFoundError("Document");
        }
        return deleted;
    }

    async findById(
        tenantId: string,
        documentId: string,
    ) {

        const document = await this.documentsRepository.findById(tenantId, documentId);

        if (!document) {
            throw new NotFoundError(
                "Document not found.",
            );
        }
        return document;
    }

    async findAll(tenantId: string) {
        return this.documentsRepository.findAll(
            tenantId
        );
    }

    async getStatus(
        tenantId: string,
        documentId: string,
    ) {
        const document = await this.documentsRepository.getStatus(
            tenantId,
            documentId,
        );

        if (!document) {
            throw new NotFoundError(
                "Document not found.",
            );
        }

        return document;
    }
}
