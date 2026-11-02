CREATE TABLE "evaluation_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"expected_answer" text NOT NULL,
	"rewritten_query" text,
	"generated_answer" text NOT NULL,
	"retrieval_precision" real NOT NULL,
	"answer_relevance" real NOT NULL,
	"groundedness" real NOT NULL,
	"overall_score" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
