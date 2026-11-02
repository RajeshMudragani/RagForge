import client from "prom-client";

export const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "status"],
});

export const documentJobsTotal = new client.Counter({
    name: "document_jobs_total",
    help: "Total document jobs processed",
});

export const evaluationJobsTotal = new client.Counter({
    name: "evaluation_jobs_total",
    help: "Total evaluation jobs processed",
});

export const ollamaRequestsTotal = new client.Counter({
    name: "ollama_requests_total",
    help: "Total Ollama requests",
});

export const embeddingCacheHits = new client.Counter({
    name: "embedding_cache_hits_total",
    help: "Embedding cache hits",
});

export const embeddingCacheMisses = new client.Counter({
    name: "embedding_cache_misses_total",
    help: "Embedding cache misses",
});

export const embeddingLatencyMs = new client.Histogram({
    name: "embedding_latency_ms",
    help: "Embedding generation latency in ms",
    buckets: [50, 100, 200, 500, 1000, 2000],
});

export const retrievalLatencyMs = new client.Histogram({
    name: "retrieval_latency_ms",
    help: "Hybrid search latency in ms",
    buckets: [50, 100, 200, 500, 1000],
});

export const hybridScoreHistogram = new client.Histogram({
    name: "retrieval_hybrid_score",
    help: "Distribution of top-1 hybrid scores per query",
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
});

export const queryRewriterFired = new client.Counter({
    name: "query_rewriter_fired_total",
    help: "Number of times the query rewriter produced a rewritten query",
});

export const llmLatencyMs = new client.Histogram({
    name: "llm_latency_ms",
    help: "LLM generation latency in ms",
    buckets: [500, 1000, 2000, 5000, 10000, 20000],
});