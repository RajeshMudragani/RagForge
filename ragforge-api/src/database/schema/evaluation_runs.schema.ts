import {
    pgTable,
    uuid,
    text,
    real,
    timestamp,
} from "drizzle-orm/pg-core";

export const evaluationRuns = pgTable(
    "evaluation_runs",
    {
        id:
            uuid("id")
                .primaryKey(),

        tenantId:
            uuid(
                "tenant_id",
            ).notNull(),

        question:
            text(
                "question",
            ).notNull(),

        expectedAnswer:
            text(
                "expected_answer",
            ).notNull(),

        rewrittenQuery:
            text(
                "rewritten_query",
            ),

        generatedAnswer:
            text(
                "generated_answer",
            ).notNull(),

        retrievalPrecision:
            real(
                "retrieval_precision",
            ).notNull(),

        answerRelevance:
            real(
                "answer_relevance",
            ).notNull(),

        groundedness:
            real(
                "groundedness",
            ).notNull(),

        overallScore:
            real(
                "overall_score",
            ).notNull(),

        createdAt:
            timestamp(
                "created_at",
                {
                    withTimezone: true,
                },
            )
                .defaultNow()
                .notNull(),

        updatedAt:
            timestamp(
                "updated_at",
                {
                    withTimezone: true,
                },
            )
                .defaultNow()
                .notNull(),
    },
);