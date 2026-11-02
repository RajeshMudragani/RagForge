CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"rating" varchar(20) NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
