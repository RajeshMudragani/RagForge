import { UsersRepository } from "./users.repository.js";

export class UsersService {

    private readonly repository = new UsersRepository();

    async create(
        data: Parameters<UsersRepository["create"]>[0],
    ): Promise<string> {
        return this.repository.create(
            data,
        );
    }

    async findAll() {
        return this.repository.findAll();
    }

    async findById(
        userId: string,
    ) {
        return this.repository.findById(
            userId,
        );
    }

    async findByEmail(
        email: string,
    ) {
        return this.repository.findByEmail(email);
    }

    async update(
        userId: string,
        data: Record<
            string,
            unknown
        >,
    ) {
        await this.repository.update(
            userId,
            data,
        );
    }

    async delete(
        userId: string,
    ) {
        await this.repository.delete(
            userId,
        );
    }
}