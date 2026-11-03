import { sql } from "drizzle-orm";
import { db } from "../../config/db.config.js";

export interface SpreadsheetDocument {
    id: string;
    filename: string;
    storageKey: string;
}

export class SpreadsheetCountRepository {
    async findForTenant(
        tenantId: string,
        collectionName?: string,
        metadata?: Record<string, string>,
    ): Promise<SpreadsheetDocument[]> {
        const conditions = [
            sql`d.tenant_id = ${tenantId}`,
            sql`d.status = 'COMPLETED'`,
            sql`(
                lower(d.filename) LIKE '%.xlsx'
                OR lower(d.filename) LIKE '%.ods'
                OR lower(d.filename) LIKE '%.csv'
            )`,
        ];

        if (collectionName) {
            conditions.push(sql`c.name = ${collectionName}`);
        }

        for (const [key, value] of Object.entries(metadata ?? {})) {
            conditions.push(sql`EXISTS (
                SELECT 1
                FROM document_metadata dm
                WHERE dm.document_id = d.id
                    AND dm.key = ${key}
                    AND dm.value = ${value}
            )`);
        }

        const result = await db.execute(sql`
            SELECT d.id, d.filename, d.storage_key AS "storageKey"
            FROM documents d
            LEFT JOIN collections c ON c.id = d.collection_id
            WHERE ${sql.join(conditions, sql` AND `)}
            ORDER BY d.filename
        `);

        return result.rows.map(row => ({
            id: String(row.id),
            filename: String(row.filename),
            storageKey: String(row.storageKey),
        }));
    }
}
