import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../config/db.config.js";
import { evaluationRuns } from "../../database/schema/evaluation_runs.schema.js";

type CreateEvaluationRunInput =
    Omit<
        typeof evaluationRuns.$inferInsert,
        "id" | "tenantId"
    >;

export class EvaluationRepository {

    async create(
        tenantId: string,
        data: CreateEvaluationRunInput,
    ): Promise<string> {

        const id = randomUUID();

        await db
            .insert(evaluationRuns)
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
                evaluationRuns,
            )
            .where(
                eq(
                    evaluationRuns.tenantId,
                    tenantId,
                ),
            );
    }
}