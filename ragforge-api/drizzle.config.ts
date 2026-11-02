import { defineConfig } from "drizzle-kit";
import { env } from "./src/config/env.config.js";

export default defineConfig({
    schema: "./src/database/schema/*",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: env.DATABASE_URL,
    },
});