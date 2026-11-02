import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "../../config/db.config.js";
import { users } from "../../database/schema/users.schema.js";
import { publicUserSelect } from "./users.select.js";

type CreateUserInput = Omit<
        typeof users.$inferInsert,
        "id"
    >;

export class UsersRepository {

    async create(
        data: CreateUserInput,
    ): Promise<string> {

        const id = randomUUID();

        await db
            .insert(users)
            .values({
                id,
                ...data,
            });

        return id;
    }

    async findAll() {
        return db
            .select(publicUserSelect)
            .from(users)
            .orderBy(
                desc(users.createdAt),
            );
    }

    async findById(
        userId: string,
    ) {

        const result = await db
            .select(publicUserSelect)
            .from(users)
            .where(
                eq(
                    users.id,
                    userId,
                ),
            )
            .limit(1);

        return result[0] ?? null;
    }

    async findByEmail(
        email: string,
    ) {

        const result = await db
            .select()
            .from(users)
            .where(
                eq(
                    users.email,
                    email,
                ),
            )
            .limit(1);

        return result[0] ?? null;
    }

    async update(
        userId: string,
        data: Partial<
            Omit<
                typeof users.$inferInsert,
                "id"
            >
        >,
    ) {
        await db.update(users).set({
            ...data,
            updatedAt: new Date(),
        })
        .where(
            eq(
                users.id,
                userId,
            ),
        );
    }

    async delete(
        userId: string,
    ) {
        await db.delete(users).where(
            eq(
                users.id,
                userId,
            ),
        );
    }
}