import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env.config.js";

let r2Client: S3Client | undefined;

export function getR2Config() {
    const {
        R2_ENDPOINT,
        R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY,
        R2_BUCKET_NAME,
    } = env;

    if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
        throw new Error("R2 settings are required when STORAGE_PROVIDER is r2");
    }

    r2Client ??= new S3Client({
        region: "auto",
        endpoint: R2_ENDPOINT,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });

    return {
        client: r2Client,
        bucketName: R2_BUCKET_NAME,
    };
}