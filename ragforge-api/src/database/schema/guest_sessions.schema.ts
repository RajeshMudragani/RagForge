import {
    pgTable,
    uuid,
    varchar,
    integer,
    timestamp,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

export const guestSessions = pgTable("guest_sessions", {
    id: uuid("id").primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    uploadCount: integer("upload_count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
    uniqueIndex("guest_sessions_token_hash_idx").on(table.tokenHash),
    index("guest_sessions_expires_at_idx").on(table.expiresAt),
]);
