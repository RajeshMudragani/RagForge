import { Readable } from "node:stream";
import { env } from "../config/env.config.js";
import { MinioService } from "./minio/minio.service.js";
import { R2StorageService } from "./r2-storage.service.js";

interface StorageBackend {
    uploadObject(objectName: string, buffer: Buffer, mimeType: string): Promise<void>;
    downloadObject(objectName: string): Promise<Readable>;
    removeObject(objectName: string): Promise<void>;
    statObject(objectName: string): Promise<unknown>;
    downloadObjectAsBuffer(objectName: string): Promise<Buffer>;
    healthCheck(): Promise<void>;
}

export class StorageService implements StorageBackend {
    private readonly backend: StorageBackend =
        env.STORAGE_PROVIDER === "r2"
            ? new R2StorageService()
            : new MinioService();

    uploadObject(objectName: string, buffer: Buffer, mimeType: string): Promise<void> {
        return this.backend.uploadObject(objectName, buffer, mimeType);
    }

    downloadObject(objectName: string): Promise<Readable> {
        return this.backend.downloadObject(objectName);
    }

    removeObject(objectName: string): Promise<void> {
        return this.backend.removeObject(objectName);
    }

    statObject(objectName: string): Promise<unknown> {
        return this.backend.statObject(objectName);
    }

    downloadObjectAsBuffer(objectName: string): Promise<Buffer> {
        return this.backend.downloadObjectAsBuffer(objectName);
    }

    healthCheck(): Promise<void> {
        return this.backend.healthCheck();
    }
}
