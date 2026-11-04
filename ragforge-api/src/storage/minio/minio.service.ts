import { Readable } from "node:stream";
import { createMinioClient } from "./minio.client.js";
import { env } from "../../config/env.config.js";

export class MinioService {
    private readonly minioClient = createMinioClient();

    private get bucketName(): string {
        if (!env.MINIO_BUCKET) {
            throw new Error("MINIO_BUCKET is required when STORAGE_PROVIDER is minio");
        }

        return env.MINIO_BUCKET;
    }

    async ensureBucketExists(): Promise<void> {
        const exists = await this.minioClient.bucketExists(this.bucketName);

        if (!exists) {
            await this.minioClient.makeBucket(this.bucketName, env.MINIO_REGION);
        }
    }

    async uploadObject(
        objectName: string,
        buffer: Buffer,
        mimeType: string,
    ): Promise<void> {
        await this.ensureBucketExists();

        await this.minioClient.putObject(
            this.bucketName,
            objectName,
            buffer,
            buffer.length,
            {
                "Content-Type": mimeType,
            },
        );
    }

    async downloadObject(
        objectName: string,
    ): Promise<Readable> {
        return this.minioClient.getObject(
            this.bucketName,
            objectName,
        );
    }

    async removeObject(
        objectName: string,
    ): Promise<void> {
        await this.minioClient.removeObject(
            this.bucketName,
            objectName,
        );
    }

    async statObject(
        objectName: string,
    ) {
        return this.minioClient.statObject(
            this.bucketName,
            objectName,
        );
    }

    async downloadObjectAsBuffer(
        objectName: string,
    ): Promise<Buffer> {
        const stream =
            await this.downloadObject(
                objectName,
            );

        const chunks: Buffer[] = [];

        return new Promise(
            (resolve, reject) => {
                stream.on(
                    "data",
                    (chunk) => {
                        chunks.push(
                            Buffer.isBuffer(chunk)
                                ? chunk
                                : Buffer.from(chunk),
                        );
                    },
                );

                stream.on(
                    "end",
                    () => {
                        resolve(
                            Buffer.concat(chunks),
                        );
                    },
                );

                stream.on(
                    "error",
                    reject,
                );
            },
        );
    }

    async healthCheck(): Promise<void> {
        await this.ensureBucketExists();

        await this.minioClient.bucketExists(this.bucketName);
    }
}
