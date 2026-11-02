import client from "prom-client";

export const register = new client.Registry();

client.collectDefaultMetrics({
    register,
});

export class MetricsService {
    async getMetrics() {
        return register.metrics();
    }
}