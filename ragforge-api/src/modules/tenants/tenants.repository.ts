import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { tenants } from "../../database/schema/tenants.schema.js";

type CreateTenantInput = Omit<
        typeof tenants.$inferInsert,
        "id"
    >;

export class TenantsRepository {

    async create(
        data: CreateTenantInput,
    ): Promise<string> {

        const id = randomUUID();

        await db
            .insert(
                tenants,
            )
            .values({
                id,
                ...data,
            });

        return id;
    }

    async findAll() {

        return db
            .select()
            .from(
                tenants,
            )
            .orderBy(
                desc(
                    tenants.createdAt,
                ),
            );
    }

    async findById(
        tenantId: string,
    ) {

        const result = await db
            .select()
            .from(
                tenants,
            )
            .where(
                eq(
                    tenants.id,
                    tenantId,
                ),
            )
            .limit(1);

        return result[0] ?? null;
    }

    async findBySlug(
        slug: string,
    ) {

        const result = await db
            .select()
            .from(
                tenants,
            )
            .where(
                eq(
                    tenants.slug,
                    slug,
                ),
            )
            .limit(1);

        return result[0] ?? null;
    }

    async update(
        tenantId: string,
        data: Partial<
            Omit<
                typeof tenants.$inferInsert,
                "id"
            >
        >,
    ) {

        await db
            .update(
                tenants,
            )
            .set({
                ...data,
                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    tenants.id,
                    tenantId,
                ),
            );
    }

    async delete(
        tenantId: string,
    ) {

        await db
            .delete(
                tenants,
            )
            .where(
                eq(
                    tenants.id,
                    tenantId,
                ),
            );
    }
}