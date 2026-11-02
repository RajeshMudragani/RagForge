		

<p align="center">
  <h1 align="center">RAGForge</h1>
  <p align="center">
    A document-grounded AI workspace with a Node.js API and React admin interface.<br/>
    Upload documents, manage collections, and ask questions with cited answers.
  </p>
</p>

---

## What is RAG and Why Does It Matter?

Large Language Models (LLMs) like LLaMA are powerful, but they have a fundamental limitation — **they only know what they were trained on**. They cannot answer questions about your internal documents, your company's knowledge base, or anything that happened after their training cutoff.

**Retrieval-Augmented Generation (RAG)** solves this by giving the LLM access to your own data at query time. Instead of relying on memorized knowledge, the model is shown the most relevant excerpts from your documents and asked to answer based on that context.

```
Without RAG:   User Question → LLM → Answer (from training data only)

With RAG:      User Question → Search Your Documents → Relevant Excerpts
                                                              ↓
                              LLM sees: Question + Your Data → Grounded Answer
```

This project is a complete, self-hosted RAG backend. You own the data, you own the models, nothing leaves your infrastructure.

---

## Table of Contents

- [Features](#features)
- [How It Works — The Full Pipeline](#how-it-works--the-full-pipeline)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Admin UI](#admin-ui)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Core Concepts Explained](#core-concepts-explained)
- [Configuration Tuning Guide](#configuration-tuning-guide)
- [Scripts](#scripts)

---

## Features

- **Authentication** — JWT (RS256) with per-tenant isolation. All document and chat routes require a Bearer token
- **Document ingestion** — Upload PDF, TXT, Markdown, and DOCX files
- **Automatic chunking** — Documents are split into overlapping chunks for better retrieval coverage
- **Vector embeddings** — Each chunk is converted to a numerical vector using Ollama's embedding models
- **Hybrid search** — Combines semantic vector search (meaning-based) with keyword full-text search for best-of-both-worlds retrieval
- **Query rewriting** — Short follow-up questions are automatically expanded using conversation history before searching
- **Multi-turn conversations** — Conversation memory is maintained per session via a unique `conversationId`
- **Multiple prompt modes** — Choose between `default`, `strict` (evidence-only), and `concise` (bullet points) response styles
- **Async ingestion** — Document processing runs in a BullMQ background worker. Upload returns immediately; poll for `READY` status
- **Fully local** — Runs entirely on your own infrastructure using Ollama. No OpenAI API keys, no data leaving your network
- **Structured error handling** — Every error returns a consistent JSON shape with typed error codes
- **Production-ready** — Graceful shutdown, structured logging with Pino, request ID tracing, Helmet security headers

---

## How It Works — The Full Pipeline

Understanding the pipeline is the key to understanding this entire codebase. There are two distinct flows.

### Flow 1 — Document Ingestion

This is how a document goes from a raw file to a searchable knowledge base.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE                           │
│                                                                     │
│  1. Upload        2. Store          3. Queue                        │
│  ─────────        ───────           ───────                         │
│  User uploads  →  File saved    →   BullMQ job enqueued (async)    │
│  file via API     to MinIO          status → PENDING                │
│                   object store                                      │
│                                                                     │
│  4. Extract       5. Chunk          6. Embed                        │
│  ────────         ───────           ──────                          │
│  PDF: pdf-parse →  Text split    →  Each chunk sent to Ollama      │
│  TXT/MD: utf-8    into 1000-char    embed model (bge-m3)           │
│  read directly    overlap windows   → 1024-dim vector              │
│                                                                     │
│  7. Store Vectors                                                   │
│  ─────────────────                                                  │
│  Chunk + its vector saved to PostgreSQL with pgvector              │
│  status → READY (or FAILED on error)                               │
└─────────────────────────────────────────────────────────────────────┘
```

```

### Flow 2 — Chat / Question Answering

This is what happens every time a user asks a question.
```

┌─────────────────────────────────────────────────────────────────────┐
│                          CHAT PIPELINE                              │
│                                                                     │
│  User Question                                                      │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────┐                                                │
│  │  Query Rewriter  │  If short follow-up + conversation history,   │
│  │  (Ollama LLM)    │  rewrite "What about it?" →                   │
│  └────────┬────────┘  "What are the performance implications of     │
│           │            React useEffect?"                            │
│           ▼                                                         │
│  ┌──────────────────────────────────────────────────┐              │
│  │              Hybrid Search                        │              │
│  │                                                   │              │
│  │  ┌─────────────────┐    ┌──────────────────────┐ │              │
│  │  │  Vector Search   │    │   Keyword Search      │ │              │
│  │  │  (pgvector       │    │   (PostgreSQL         │ │              │
│  │  │   cosine sim)    │    │    full-text ts_rank) │ │              │
│  │  └────────┬────────┘    └──────────┬───────────┘ │              │
│  │           │                        │              │              │
│  │           └──────────┬─────────────┘              │              │
│  │                      ▼                            │              │
│  │           Score Fusion (60% vector,               │              │
│  │           40% keyword) → ranked chunks            │              │
│  └──────────────────────┬───────────────────────────┘              │
│                         │                                           │
│                         ▼                                           │
│  ┌──────────────────────────────┐                                   │
│  │      Context Builder         │  Top 5 chunks cleaned,            │
│  │                              │  joined, truncated to 8000 chars  │
│  └──────────────┬───────────────┘                                   │
│                 │                                                   │
│                 ▼                                                   │
│  ┌──────────────────────────────┐                                   │
│  │      Prompt Builder          │  Injects: History + Context +     │
│  │                              │  Question into chosen template    │
│  └──────────────┬───────────────┘                                   │
│                 │                                                   │
│                 ▼                                                   │
│  ┌──────────────────────────────┐                                   │
│  │      Ollama LLM              │  Generates the final answer       │
│  │      (llama3.2)              │                                   │
│  └──────────────┬───────────────┘                                   │
│                 │                                                   │
│                 ▼                                                   │
│  Response: { answer, sources, conversationId, promptType }         │
└─────────────────────────────────────────────────────────────────────┘

```

---

## Tech Stack

| Layer            | Technology            | Purpose                                                       |
| ---------------- | --------------------- | ------------------------------------------------------------- |
| Runtime          | Node.js (ESM)         | Server runtime                                                |
| Language         | TypeScript 7          | Type safety across the entire codebase                        |
| Framework        | Express 5             | HTTP server and routing                                       |
| ORM              | Drizzle ORM           | Type-safe PostgreSQL queries                                  |
| Database         | PostgreSQL + pgvector | Stores documents, chunks, and vector embeddings               |
| Object Storage   | MinIO                 | Stores raw uploaded files (S3-compatible)                     |
| LLM & Embeddings | Ollama                | Runs LLM (llama3.2) and embedding model (bge-m3) locally      |
| Job Queue        | BullMQ + ioredis      | Background workers for async document ingestion               |
| Cache / Sessions | Redis (node-redis)    | Rate limiting, session storage                                |
| Auth             | JWT (RS256)           | Stateless auth with per-tenant isolation                      |
| Validation       | Zod v4                | Runtime schema validation for all request bodies and env vars |
| Logging          | Pino + pino-http      | Structured JSON logging with request tracing                  |
| Security         | Helmet + CORS         | HTTP security headers                                         |

---

## Prerequisites

Before running this project you need the following installed and running:

### 1. PostgreSQL with pgvector

pgvector is a PostgreSQL extension that adds vector similarity search. It must be installed in your PostgreSQL instance.

```bash
# Using Docker (recommended for local dev)
docker run -d \
  --name pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ragdb \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### 2. MinIO

MinIO is an S3-compatible object store used to store uploaded files.

```bash
docker run -d \
  --name minio \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=admin@123 \
  -p 9000:9000 \
  -p 9001:9001 \
  minio/minio server /data --console-address ":9001"
```

MinIO console is available at `http://localhost:9001` (admin / admin@123).

### 3. Ollama

Ollama runs LLMs and embedding models locally.

```bash
# Install Ollama — https://ollama.com/download

# Pull the LLM used for chat
ollama pull llama3.2

# Pull the embedding model
ollama pull bge-m3
```

Verify Ollama is running at `http://localhost:11434`.

### 4. Redis

Redis is required for BullMQ job queues and rate limiting.

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 5. Node.js

Node.js 20 or higher is required.

```bash
node --version  # should be >= 20
```

---

## Getting Started

RAGForge is split into two independently installed applications: `ragforge-api` and `ragforge-admin`. Start PostgreSQL with the pgvector extension, Redis, MinIO, and the configured LLM provider before starting the API. The API also supports Ollama locally; see [Prerequisites](#prerequisites).

```bash
# Install and configure the API
cd ragforge-api
npm install
cp .env.example .env
# Edit .env with your local service URLs and provider credentials

# Apply database migrations and start the API
npm run db:migrate
npm run dev
```

The API listens on `http://localhost:7892` with the provided environment example. Keep it on port `7892` for the admin's default Vite proxy, or update `ragforge-admin/vite.config.ts` if you choose another API port. The API prefix defaults to `/api/v1`.

In another terminal, start the admin UI:

```bash
cd ragforge-admin
npm install
npm run dev
```

Vite serves the admin UI at `http://localhost:3000` and proxies `/api` requests to `http://localhost:7892`.

---

## Environment Variables

The API reads `ragforge-api/.env` from the API working directory. Start-up validates `process.env` with Zod in `src/config/env.config.ts`; if a value is missing or invalid, the API logs each failing variable and exits before serving requests. Use [`ragforge-api/.env.example`](ragforge-api/.env.example) as the complete template and keep real `.env` files out of version control.

The schema requires `NODE_ENV`, `PORT`, `LOG_LEVEL`, `DATABASE_URL`, all `OLLAMA_*` settings, `EMBEDDING_DIMENSIONS`, all `MINIO_*` settings except `MINIO_REGION`, both JWT expiry settings, `REDIS_HOST`, `REDIS_PORT`, `GEMINI_MODEL`, and `GEMINI_API_KEY`. Numeric settings are coerced to numbers, URLs such as `OLLAMA_BASE_URL` must be valid, and boolean-like settings must be the strings `true` or `false`.

Several settings have schema defaults and may be omitted; these include database pool limits, API prefix and request limits, rate limits, Redis password/database, cache TTLs, worker/job settings, `LLM_PROVIDER`, `OPENROUTER_MODEL`, and `MINIO_REGION`. The current schema still requires non-empty `GEMINI_MODEL` and `GEMINI_API_KEY` even when `LLM_PROVIDER` is `ollama` or `openrouter`; supply values to pass startup validation. Set `OPENROUTER_API_KEY` when using OpenRouter.

> **Important:** `EMBEDDING_DIMENSIONS` must exactly match the output dimensions of your `OLLAMA_EMBED_MODEL`. For `bge-m3` this is `1024`. If you switch models, update this value and re-run migrations.

The admin UI does not require an env file when using the default Vite proxy. To point it directly at another API URL, create `ragforge-admin/.env.local` and set `VITE_API_URL`, for example `VITE_API_URL=http://localhost:7892/api/v1`. Vite exposes variables prefixed with `VITE_` to browser code, so do not put secrets there.

## Admin UI

The React admin application lives in `ragforge-admin/` and provides sign-in/registration, streaming chat, conversation history, source citations, document uploads and ingestion status, collection management, and response feedback.

```bash
cd ragforge-admin
npm install
npm run dev
```

The development server uses port `3000`. By default, requests to `/api` are proxied to `http://localhost:7892`; the API must be running for authentication and data workflows. Set `VITE_API_URL` in `.env.local` only when you need to bypass the proxy. The production build and local preview are available with:

```bash
npm run build
npm run preview
```

### Admin stack

| Layer                | Technology                                             |
| -------------------- | ------------------------------------------------------ |
| UI                   | React 19 + TypeScript                                  |
| Build and dev server | Vite                                                   |
| Styling              | Tailwind CSS                                           |
| Routing              | React Router                                           |
| HTTP and streaming   | Axios + Server-Sent Events                             |
| Markdown and code    | react-markdown + remark-gfm + react-syntax-highlighter |
| Icons                | lucide-react                                           |

The API and admin each have their own `package.json`; install dependencies and run scripts from the corresponding directory.

---

## API Reference

All routes are prefixed with `/api/v1`.

### Authentication

All document, retrieval, and chat endpoints require a JWT Bearer token.

```
Authorization: Bearer <accessToken>
```

Obtain a token via `POST /api/v1/auth/login`. The token encodes the user's `tenantId` — all queries are automatically scoped to that tenant.

---

### Auth

| Method   | Endpoint                  | Auth Required | Description                               |
| -------- | ------------------------- | ------------- | ----------------------------------------- |
| `POST` | `/api/v1/auth/register` | No            | Register a new user under a tenant        |
| `POST` | `/api/v1/auth/login`    | No            | Login and receive access + refresh tokens |
| `GET`  | `/api/v1/auth/me`       | Yes           | Returns the decoded JWT payload           |
| `POST` | `/api/v1/auth/refresh`  | No            | Exchange a refresh token for new tokens   |
| `POST` | `/api/v1/auth/logout`   | No            | Revoke a refresh token                    |

**Login Response `200`**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": "uuid", "email": "user@example.com", "role": "ADMIN" }
  }
}
```

---

### Health

| Method  | Endpoint              | Description                                                          |
| ------- | --------------------- | -------------------------------------------------------------------- |
| `GET` | `/api/v1/health`    | Liveness check — returns`200 OK` if server is up                  |
| `GET` | `/api/v1/health/db` | Readiness check — returns`200` if DB is reachable, `503` if not |

---

### Documents

> All document endpoints require `Authorization: Bearer <token>`.

#### Upload a Document

```
POST /api/v1/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

| Field              | Type   | Required | Description                  |
| ------------------ | ------ | -------- | ---------------------------- |
| `file`           | File   | Yes      | The document to upload       |
| `collectionName` | string | No       | Assign to a named collection |

Supported file types: `application/pdf`, `text/plain`, `text/markdown`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Ingestion is **asynchronous** — the upload returns immediately with `status: PENDING`. A BullMQ background worker picks up the job and processes it. Poll `GET /documents/:id` to track progress.

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "company-handbook.pdf",
    "mimeType": "application/pdf",
    "storageKey": "documents/2025/01/uuid.pdf",
    "tenantId": "tenant-uuid",
    "status": "PENDING",
    "metadata": { "size": 204800 },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

Document status lifecycle: `PENDING` → `PROCESSING` → `READY` (or `FAILED`)

---

#### Process a Document (Manual Re-trigger)

Ingestion runs automatically via the background worker after upload. Use this endpoint to manually re-trigger ingestion, e.g. after a `FAILED` status.

```
POST /api/v1/documents/:id/process
Authorization: Bearer <token>
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "chunksCreated": 42,
    "status": "READY"
  }
}
```

---

#### List All Documents

```
GET /api/v1/documents
Authorization: Bearer <token>
```

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-...",
      "filename": "company-handbook.pdf",
      "status": "READY",
      ...
    }
  ]
}
```

---

#### Get a Document by ID

```
GET /api/v1/documents/:id
Authorization: Bearer <token>
```

**Response `200`** — returns the document record
**Response `404`** — `{ "success": false, "error": { "code": "NOT_FOUND", "message": "Document not found" } }`

---

### Retrieval

These endpoints let you search your document knowledge base directly, without going through the chat pipeline. Useful for debugging retrieval quality.

> All retrieval endpoints require `Authorization: Bearer <token>`.

#### Hybrid Search

Returns ranked document chunks matching the query.

```
POST /api/v1/retrieval/search
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "query": "What is the vacation policy?",
  "limit": 5
}
```

| Field     | Type   | Required | Default | Max    |
| --------- | ------ | -------- | ------- | ------ |
| `query` | string | Yes      | —      | —     |
| `limit` | number | No       | `5`   | `20` |

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": "chunk-uuid",
      "documentId": "doc-uuid",
      "filename": "company-handbook.pdf",
      "content": "Employees are entitled to 20 days of paid vacation...",
      "chunkIndex": 7,
      "similarity": 0.87,
      "keywordScore": 0.43,
      "hybridScore": 0.69
    }
  ]
}
```

---

#### Retrieve Context

Same as search but returns the chunks already assembled into a single context string, ready to be injected into a prompt. Useful for inspecting what the LLM will actually see.

```
POST /api/v1/retrieval/context
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "query": "What is the vacation policy?",
  "limit": 5
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "context": "Employees are entitled to 20 days...\n\n---\n\nVacation requests must be submitted...",
    "sources": [
      {
        "documentId": "doc-uuid",
        "filename": "company-handbook.pdf",
        "chunkIndex": 7,
        "similarity": 0.87,
        "keywordScore": 0.43,
        "hybridScore": 0.69
      }
    ]
  }
}
```

---

### Chat

The main endpoint. Ask questions in natural language and get answers grounded in your documents.

> Requires `Authorization: Bearer <token>`.

```
POST /api/v1/chat
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "question": "How many vacation days do employees get?",
  "topK": 5,
  "promptType": "default",
  "conversationId": "optional-uuid-for-multi-turn"
}
```

| Field              | Type   | Required | Default        | Description                                                     |
| ------------------ | ------ | -------- | -------------- | --------------------------------------------------------------- |
| `question`       | string | Yes      | —             | The user's question                                             |
| `topK`           | number | No       | `5`          | Number of document chunks to retrieve (max 20)                  |
| `promptType`     | string | No       | `default`    | `default` \| `strict` \| `concise`                        |
| `conversationId` | UUID   | No       | auto-generated | Pass the ID from a previous response to continue a conversation |

#### Prompt Types

| Type        | Behaviour                                                                                | Best For                               |
| ----------- | ---------------------------------------------------------------------------------------- | -------------------------------------- |
| `default` | Helpful assistant, uses context but can supplement with general knowledge                | General Q&A                            |
| `strict`  | Answers ONLY from provided context. Returns evidence quotes. Refuses if answer not found | Compliance, legal, auditable use cases |
| `concise` | Returns bullet-point answers only                                                        | Quick lookups, summaries               |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "answer": "Employees are entitled to 20 days of paid vacation per year, as outlined in Section 4 of the company handbook.",
    "conversationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "promptType": "default",
    "sources": [
      {
        "documentId": "550e8400-e29b-41d4-a716-446655440000",
        "filename": "company-handbook.pdf",
        "chunkIndex": 7,
        "similarity": 0.87
      }
    ]
  }
}
```

#### Multi-turn Conversation Example

```bash
# First message — no conversationId needed
curl -X POST http://localhost:7892/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "question": "What are React Hooks?" }'

# Response includes: "conversationId": "abc-123"

# Follow-up — pass the conversationId back
curl -X POST http://localhost:7892/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "question": "Tell me more about useEffect", "conversationId": "abc-123" }'

# The query rewriter will expand "Tell me more about useEffect"
# into "Explain the React useEffect hook" before searching,
# using the conversation history for context.
```

---

### Embeddings

Direct access to the embedding model. Useful for testing or building custom search tooling.

```
POST /api/v1/embeddings/generate
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "text": "What is the capital of France?"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "model": "bge-m3",
    "dimensions": 1024,
    "embedding": [0.023, -0.041, 0.187, ...]
  }
}
```

---

### Error Responses

All errors follow a consistent shape:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Document not found"
  }
}
```

Validation errors (invalid request body) include a `details` array:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "path": ["question"], "message": "Required" }
    ]
  }
}
```

| HTTP Status | Code                      | Meaning                                        |
| ----------- | ------------------------- | ---------------------------------------------- |
| `200`     | —                        | Success                                        |
| `201`     | —                        | Resource created                               |
| `400`     | `BAD_REQUEST`           | Missing required field (e.g. no file uploaded) |
| `404`     | `NOT_FOUND`             | Resource does not exist                        |
| `409`     | `CONFLICT`              | Resource already exists                        |
| `422`     | `VALIDATION_ERROR`      | Request body failed schema validation          |
| `500`     | `INTERNAL_SERVER_ERROR` | Unexpected server error                        |
| `503`     | —                        | Dependency unavailable (e.g. DB down)          |

---

## Project Structure

```
src/
├── common/                    # Shared cross-cutting concerns
│   ├── errors/                # AppError base class + typed HTTP errors
│   ├── middleware/            # Rate limiting middleware
│   ├── types/                 # ApiResponse types + successResponse() helper
│   └── utils/                 # sanitizeText() and other shared utilities
│
├── config/
│   ├── env.config.ts          # Zod-validated environment schema
│   ├── db.config.ts           # PostgreSQL pool + Drizzle instance
│   ├── redis.config.ts        # node-redis client (cache / rate limiting)
│   └── bullmq.config.ts       # ioredis connection for BullMQ queues/workers
│
├── constants/
│   └── http.constants.ts      # HTTP_STATUS and ERROR_CODES enums
│
├── database/
│   └── schema/                # Drizzle table definitions
│       ├── documents.schema.ts
│       └── document_chunks.schema.ts
│
├── logger/
│   └── logger.ts              # Pino logger instance
│
├── middlewares/
│   ├── errors.middleware.ts   # Global error handler
│   └── request-logger.middleware.ts
│
├── modules/
│   ├── auth/                  # JWT auth, RS256 signing keys, tenant middleware
│   │   ├── middleware/        # authMiddleware, tenantMiddleware, roleMiddleware
│   │   └── auth_key/          # RSA key pair management
│   ├── chat/                  # Chat pipeline, prompt building, conversation memory
│   ├── collections/           # Document collection management
│   ├── context-builder/       # Assembles retrieved chunks into LLM-ready context
│   ├── documents/             # Document upload, storage, metadata management
│   ├── embeddings/            # Embedding generation via Ollama
│   ├── evaluation/            # RAG answer evaluation
│   ├── feedback/              # User feedback on answers
│   ├── health/                # Liveness and readiness endpoints
│   ├── ingestion/             # Text extraction (PDF + plain text), chunking, embedding pipeline
│   ├── jobs/
│   │   ├── queue/             # BullMQ queue definitions + QueueService
│   │   └── workers/           # document.worker, evaluation.worker, notification.worker
│   ├── llm/                   # Ollama LLM adapter
│   ├── query-rewriter/        # Rewrites follow-up questions into standalone queries
│   ├── reranker/              # LLM-based result reranker
│   ├── retrieval/             # Hybrid vector + keyword search
│   ├── tenants/               # Tenant management (admin only)
│   └── users/                 # User management
│
├── storage/
│   └── minio/                 # MinIO client and service
│
├── app.ts                     # Express app setup
└── server.ts                  # Server bootstrap and graceful shutdown
```

---

## Core Concepts Explained

### What is a Vector Embedding?

When text is passed to an embedding model, it outputs a list of numbers (a vector) that represents the *meaning* of that text in high-dimensional space. Texts with similar meanings produce vectors that are close together in that space.

```
"vacation policy"     → [0.023, -0.041, 0.187, ...]  (1024 numbers)
"annual leave rules"  → [0.019, -0.038, 0.191, ...]  (very similar!)
"quarterly earnings"  → [-0.412, 0.203, -0.087, ...] (very different)
```

This is how semantic search works — we embed the user's question and find document chunks whose vectors are closest to it, regardless of whether they share the exact same words.

### Why Chunking?

LLMs have a context window limit — they can only process a certain amount of text at once. A 100-page PDF cannot be fed directly to the model. Chunking splits the document into smaller pieces (1000 characters with 200-character overlap) so each piece fits in the context window.

The overlap ensures that sentences at chunk boundaries are not lost — the end of one chunk appears at the start of the next.

```
Document: [-------- chunk 1 --------][-------- chunk 2 --------]
With overlap:
  Chunk 1: [========================]
  Chunk 2:               [========================]
                         ↑ 200-char overlap
```

### Why Hybrid Search?

Neither pure vector search nor pure keyword search is perfect on its own:

|          | Vector Search                                                | Keyword Search                                   |
| -------- | ------------------------------------------------------------ | ------------------------------------------------ |
| Strength | Finds semantically similar content even with different words | Exact term matching, great for names, codes, IDs |
| Weakness | Can miss exact matches for specific terms                    | Misses paraphrased or synonymous content         |

This system combines both using a weighted score:

```
hybridScore = (vectorSimilarity × 0.6) + (normalizedKeywordScore × 0.4)
```

Results from both searches are merged, deduplicated by `documentId + chunkIndex`, and re-ranked by the hybrid score.

### What is Query Rewriting?

In a multi-turn conversation, users often ask follow-up questions with pronouns or references:

```
Turn 1: "What are React Hooks?"
Turn 2: "Tell me more about useEffect"   ← ambiguous without context
Turn 3: "When should I use it?"          ← "it" refers to useEffect
```

Before searching, the query rewriter sends the question + recent conversation history to the LLM and asks it to produce a standalone, self-contained search query:

```
"When should I use it?" + history → "When should the React useEffect hook be used?"
```

This dramatically improves retrieval quality for follow-up questions. The rewriter only activates when there is conversation history AND the question is short (≤50 characters), to avoid unnecessary LLM calls.

### Prompt Modes

The system supports three prompt templates that change how the LLM responds:

- **`default`** — General helpful assistant. Uses context but can draw on general knowledge to fill gaps.
- **`strict`** — Enterprise knowledge assistant. Answers ONLY from the provided document context. Returns a quoted evidence section. Responds with "I could not find that information" if the answer is not in the documents. Use this for compliance-sensitive applications.
- **`concise`** — Returns bullet-point answers only. Best for quick lookups.

---

## Configuration Tuning Guide

These are the key constants that control retrieval and generation quality. All are in their respective `*.constants.ts` files and driven by environment variables where appropriate.

| Constant                 | Location                         | Default         | Effect of increasing                    | Effect of decreasing                           |
| ------------------------ | -------------------------------- | --------------- | --------------------------------------- | ---------------------------------------------- |
| `CHUNK_SIZE`           | `ingestion.constants.ts`       | `1000` chars  | More context per chunk, fewer chunks    | Less context per chunk, more precise retrieval |
| `CHUNK_OVERLAP`        | `ingestion.constants.ts`       | `200` chars   | Better boundary coverage, more storage  | Risk of losing context at boundaries           |
| `MIN_SIMILARITY`       | `retrieval.constants.ts`       | `0.3`         | Fewer but more relevant vector results  | More results but potentially noisy             |
| `VECTOR_WEIGHT`        | `retrieval.constants.ts`       | `0.6`         | More semantic, less keyword influence   | More keyword, less semantic influence          |
| `KEYWORD_WEIGHT`       | `retrieval.constants.ts`       | `0.4`         | More keyword, less semantic influence   | More semantic, less keyword influence          |
| `MAX_CONTEXT_CHUNKS`   | `context-builder.constants.ts` | `5`           | More context for LLM, higher token cost | Less context, faster and cheaper               |
| `MAX_CONTEXT_LENGTH`   | `context-builder.constants.ts` | `8000` chars  | More context passed to LLM              | Less context, fits smaller models              |
| `DEFAULT_TOP_K`        | `retrieval.constants.ts`       | `5`           | More candidates retrieved               | Fewer candidates                               |
| `PROMPT_HISTORY_LIMIT` | `chat.constants.ts`            | `10` messages | Longer memory, higher token cost        | Shorter memory                                 |

> **Rule of thumb:** If answers are missing relevant information → increase `MAX_CONTEXT_CHUNKS` or `DEFAULT_TOP_K`. If answers are noisy or off-topic → increase `MIN_SIMILARITY` or decrease `VECTOR_WEIGHT`.
>
> **Note on `MIN_SIMILARITY`:** The default of `0.3` is tuned for `bge-m3`. This model produces cosine distances in a lower range than models like `text-embedding-ada-002`. If you switch embedding models, re-evaluate this threshold.

---

## Scripts

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript to dist/
npm run build

# Start production server (requires build first)
npm start

# Type-check without emitting files
npm run typecheck

# Generate a new database migration from schema changes
npm run db:generate

# Apply pending migrations to the database
npm run db:migrate
```

---

## Logging

The application uses [Pino](https://getpino.io/) for structured JSON logging. In development, logs are pretty-printed with colors. In production, logs are emitted as JSON for ingestion into log aggregators (Datadog, CloudWatch, ELK, etc.).

Every HTTP request is automatically logged with a unique `x-request-id` header. Pass `x-request-id` in your request to trace it through the logs.

```bash
# Development output (pretty-printed)
[10:30:00] INFO: Server is running on port 3000
[10:30:01] INFO: POST /api/v1/documents/upload 201 - 142ms

# Production output (JSON)
{"level":30,"time":"2025-01-15T10:30:00.000Z","msg":"Server is running on port 3000"}
```

---

## License

ISC
