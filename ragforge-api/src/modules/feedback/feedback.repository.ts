import { randomUUID } from "crypto";
import { db } from "../../config/db.config.js";
import { feedbacks } from "../../database/schema/feedbacks.schema.js";
import { eq } from "drizzle-orm";

type CreateFeedbackInput = Omit<
        typeof feedbacks.$inferInsert,
        "id" | "tenantId"
    >;

export class FeedbackRepository {

    async create(
        tenantId: string,
        data: CreateFeedbackInput,
    ): Promise<string> {

        const id = randomUUID();

        await db
            .insert(
                feedbacks,
            )
            .values({
                id,
                tenantId,
                ...data,
            });

        return id;
    }

    async findAll(
        tenantId: string,
    ) {

        return db
            .select()
            .from(
                feedbacks,
            )
            .where(
                eq(
                    feedbacks.tenantId,
                    tenantId,
                ),
            );
    }
}