import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { getR2Config } from "../config/r2.config.js";

export class R2StorageService {
    async uploadObject(
        key: string,
        file: Buffer,
        mimeType: string,
    ): Promise<void> {
        const { client, bucketName } = getR2Config();
        await client.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: file,
                ContentType: mimeType,
            }),
        );
    }

    async downloadObject(key: string): Promise<Readable> {
        const { client, bucketName } = getR2Config();
        const { Body } = await client.send(
            new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            }),
        );

        if (!Body) {
            throw new Error(`R2 returned an empty response for object "${key}"`);
        }

        return Readable.from(Body.transformToWebStream());
    }

    async removeObject(key: string): Promise<void> {
        const { client, bucketName } = getR2Config();
        await client.send(
            new DeleteObjectCommand({
                Bucket: bucketName,
                Key: key,
            }),
        );
    }

    async statObject(key: string) {
        const { client, bucketName } = getR2Config();
        return client.send(
            new HeadObjectCommand({
                Bucket: bucketName,
                Key: key,
            }),
        );
    }

    async healthCheck(): Promise<void> {
        const { client, bucketName } = getR2Config();
        await client.send(
            new HeadBucketCommand({
                Bucket: bucketName,
            }),
        );
    }

    async downloadObjectAsBuffer(key: string): Promise<Buffer> {
        const stream = await this.downloadObject(key);
        const chunks: Buffer[] = [];

        return new Promise((resolve, reject) => {
            stream.on("data", (chunk: Buffer | Uint8Array | string) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", reject);
        });
    }
}
