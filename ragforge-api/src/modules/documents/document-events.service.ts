import { createClient } from "redis";
import { env } from "../../config/env.config.js";
import { logger } from "../../logger/logger.js";
import { Response } from "express";

const CHANNEL = "document:status";

// Dedicated publisher client (separate from the cache client)
const publisher = createClient({
    socket: { host: env.REDIS_HOST, port: env.REDIS_PORT },
    password: env.REDIS_PASSWORD || undefined,
    database: env.REDIS_DB,
});

publisher.connect().catch(err => logger.error({ err }, "Document events publisher failed to connect"));
publisher.on("error", err => logger.error({ err }, "Document events publisher error"));

export interface DocumentStatusEvent {
    documentId: string;
    tenantId: string;
    status: "PROCESSING" | "EMBEDDING" | "COMPLETED" | "FAILED";
    chunksCreated?: number;
}

export async function publishDocumentStatus(event: DocumentStatusEvent) {
    await publisher.publish(CHANNEL, JSON.stringify(event));
}

// Per-tenant SSE client registry: tenantId -> Set of Response objects
const clients = new Map<string, Set<Response>>();

export function addSseClient(tenantId: string, res: Response) {
    if (!clients.has(tenantId)) clients.set(tenantId, new Set());
    clients.get(tenantId)!.add(res);
}

export function removeSseClient(tenantId: string, res: Response) {
    clients.get(tenantId)?.delete(res);
}

function sendToTenant(tenantId: string, data: string) {
    const tenantClients = clients.get(tenantId);
    if (!tenantClients?.size) return;
    for (const res of tenantClients) {
        res.write(`data: ${data}\n\n`);
    }
}

// Single subscriber for all tenants — fan-out by tenantId in-process
const subscriber = createClient({
    socket: { host: env.REDIS_HOST, port: env.REDIS_PORT },
    password: env.REDIS_PASSWORD || undefined,
    database: env.REDIS_DB,
});

subscriber.connect()
    .then(() => subscriber.subscribe(CHANNEL, (message) => {
        try {
            const event: DocumentStatusEvent = JSON.parse(message);
            sendToTenant(event.tenantId, JSON.stringify(event));
        } catch (err) {
            logger.error({ err }, "Failed to parse document status event");
        }
    }))
    .catch(err => logger.error({ err }, "Document events subscriber failed to connect"));

subscriber.on("error", err => logger.error({ err }, "Document events subscriber error"));
