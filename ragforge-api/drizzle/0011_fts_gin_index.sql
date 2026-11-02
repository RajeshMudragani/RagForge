-- Add GIN index for full-text search on document_chunks.content
-- This replaces the per-query to_tsvector() call with a pre-built index
CREATE INDEX CONCURRENTLY IF NOT EXISTS document_chunks_content_fts_idx
ON document_chunks USING GIN (to_tsvector('english', content));
