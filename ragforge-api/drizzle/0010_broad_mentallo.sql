ALTER TABLE "document_chunks" ADD COLUMN "content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "parent_chunk_index" integer;