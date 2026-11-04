import { Client } from "minio";
import { env } from "../../config/env.config.js";

export function createMinioClient(): Client {
    const {
        MINIO_ENDPOINT,
        MINIO_PORT,
        MINIO_ACCESS_KEY,
        MINIO_SECRET_KEY,
        MINIO_USE_SSL,
        MINIO_REGION,
    } = env;

    if (
        !MINIO_ENDPOINT ||
        !MINIO_PORT ||
        !MINIO_ACCESS_KEY ||
        !MINIO_SECRET_KEY ||
        MINIO_USE_SSL === undefined
    ) {
        throw new Error("MinIO settings are required when STORAGE_PROVIDER is minio");
    }

    return new Client({
        endPoint: MINIO_ENDPOINT,
        port: MINIO_PORT,
        useSSL: MINIO_USE_SSL,
        accessKey: MINIO_ACCESS_KEY,
        secretKey: MINIO_SECRET_KEY,
        region: MINIO_REGION,
    });
}
