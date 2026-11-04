export interface ServiceHealth {
    status: "UP" | "DOWN";
    latencyMs?: number;
    message?: string;
}

export interface HealthResponse {
    status: "UP" | "DOWN";
    timestamp: string;
    services: {
        database: ServiceHealth;
        redis: ServiceHealth;
        storage: ServiceHealth;
        llm: ServiceHealth;
        bullmq: ServiceHealth;
    };
}