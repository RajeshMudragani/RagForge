CREATE TABLE "auth_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kid" varchar(100) NOT NULL,
	"algorithm" varchar(20) NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
