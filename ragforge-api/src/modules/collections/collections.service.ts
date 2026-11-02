import { CollectionsRepository } from "./collections.repository.js";
import { NotFoundError } from "../../common/errors/index.js";
import { CacheService } from "../cache/cache.service.js";
import { env } from "../../config/env.config.js";

export class CollectionsService {

    private readonly repository = new CollectionsRepository();
    private readonly cache = new CacheService();

    async create(
        tenantId: string,
        name: string,
        description?: string,
    ): Promise<string> {

        return this.repository.create(
            tenantId,
            name,
            description,
        );
    }

    async getAll(
        tenantId: string,
    ) {

        return this.repository.findAll(
            tenantId,
        );
    }

    async getById(
        tenantId: string,
        collectionId: string,
    ) {

        return this.repository.findById(
            tenantId,
            collectionId,
        );
    }

    async update(
        tenantId: string,
        collectionId: string,
        data: {
            name?: string;
            description?: string;
        },
    ) {

        const existing = await this.repository.findById(
            tenantId,
            collectionId,
        );

        if (existing) {
            await this.cache.del(
                `collection:name:${tenantId}:${existing.name}`,
            );
        }

        await this.repository.update(
            tenantId,
            collectionId,
            data,
        );
    }

    async delete(
        tenantId: string,
        collectionId: string,
    ) {

        const collection = await this.repository.findById(
            tenantId,
            collectionId,
        );

        if (collection) {
            await this.cache.del(
                `collection:name:${tenantId}:${collection.name}`,
            );
        }

        await this.repository.delete(
            tenantId,
            collectionId,
        );
    }

    async findByName(
        tenantId: string,
        name: string,
    ) {

        const cacheKey = `collection:name:${tenantId}:${name}`;

        const cached = await this.cache.get<
            Awaited<
                ReturnType<
                    CollectionsRepository["findByName"]
                >
            >
        >(
            cacheKey,
        );

        if (cached) {
            return cached;
        }

        const collection = await this.repository.findByName(
            tenantId,
            name,
        );

        if (collection) {
            await this.cache.set(
                cacheKey,
                collection,
                env.CACHE_COLLECTION_TTL_SECONDS,
            );
        }

        return collection;
    }

    async findOrCreate(
        tenantId: string,
        collectionName: string,
    ): Promise<string> {

        const existing = await this.repository.findByName(
            tenantId,
            collectionName,
        );

        if (existing) {
            return existing.id;
        }

        return this.repository.create(
            tenantId,
            collectionName,
        );
    }

    async getStats(
        tenantId: string,
        collectionId: string,
    ) {

        const collection = await this.repository.findById(
            tenantId,
            collectionId,
        );

        if (!collection) {
            throw new NotFoundError(
                "Collection",
            );
        }

        return this.repository.getStats(
            collectionId,
        );
    }
}