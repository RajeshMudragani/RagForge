import { Readable } from "node:stream";
import { minioClient } from "./minio.client.js";
import { env } from "../../config/env.config.js";

export class MinioService {
    async ensureBucketExists(): Promise<void> {
        const exists = await minioClient.bucketExists(env.MINIO_BUCKET);

        if (!exists) {
            await minioClient.makeBucket(env.MINIO_BUCKET, env.MINIO_REGION);
        }
    }

    async uploadObject(
        objectName: string,
        buffer: Buffer,
        mimeType: string,
    ): Promise<void> {
        await this.ensureBucketExists();

        await minioClient.putObject(
            env.MINIO_BUCKET,
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
        return minioClient.getObject(
            env.MINIO_BUCKET,
            objectName,
        );
    }

    async removeObject(
        objectName: string,
    ): Promise<void> {
        await minioClient.removeObject(
            env.MINIO_BUCKET,
            objectName,
        );
    }

    async statObject(
        objectName: string,
    ) {
        return minioClient.statObject(
            env.MINIO_BUCKET,
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

        await minioClient.bucketExists(
            env.MINIO_BUCKET,
        );
    }
}
