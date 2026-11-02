import { randomUUID } from "crypto";
import {
    sql,
    eq,
    desc,
    and,
} from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { collections } from "../../database/schema/collections.schema.js";

export class CollectionsRepository {

    async create(
        tenantId: string,
        name: string,
        description?: string,
    ) {

        const id = randomUUID();

        await db
            .insert(collections)
            .values({
                id,
                tenantId,
                name,
                description,
            });

        return id;
    }

    async findAll(
        tenantId: string,
    ) {

        return db
            .select()
            .from(collections)
            .where(
                eq(
                    collections.tenantId,
                    tenantId,
                ),
            )
            .orderBy(
                desc(
                    collections.createdAt,
                ),
            );
    }

    async findById(
        tenantId: string,
        collectionId: string,
    ) {

        const result = await db
            .select()
            .from(collections)
            .where(
                and(
                    eq(
                        collections.id,
                        collectionId,
                    ),
                    eq(
                        collections.tenantId,
                        tenantId,
                    ),
                ),
            )
            .limit(1);

        return result[0] ?? null;
    }

    async update(
        tenantId: string,
        collectionId: string,
        data: {
            name?: string;
            description?: string;
        },
    ) {

        await db
            .update(collections)
            .set({
                ...data,
                updatedAt:
                    new Date(),
            })
            .where(
                and(
                    eq(
                        collections.id,
                        collectionId,
                    ),
                    eq(
                        collections.tenantId,
                        tenantId,
                    ),
                ),
            );
    }

    async delete(
        tenantId: string,
        collectionId: string,
    ) {

        await db
            .delete(collections)
            .where(
                and(
                    eq(
                        collections.id,
                        collectionId,
                    ),
                    eq(
                        collections.tenantId,
                        tenantId,
                    ),
                ),
            );
    }

    async findByName(
        tenantId: string,
        name: string,
    ) {

        const result = await db
            .select()
            .from(collections)
            .where(
                and(
                    eq(
                        collections.tenantId,
                        tenantId,
                    ),
                    eq(
                        collections.name,
                        name,
                    ),
                ),
            )
            .limit(1);

        return result[0] ?? null;
    }

    async getStats(
        collectionId: string,
    ) {

        const result = await db.execute(sql`
                SELECT
                    COUNT(
                        DISTINCT d.id
                    )::int AS documents,

                    COUNT(
                        dc.id
                    )::int AS chunks

                FROM documents d

                LEFT JOIN document_chunks dc
                    ON dc.document_id = d.id

                WHERE
                    d.collection_id = ${collectionId}
            `);

        return result.rows[0];
    }
}
