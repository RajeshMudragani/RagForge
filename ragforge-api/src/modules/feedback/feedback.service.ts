import { FeedbackRepository } from "./feedback.repository.js";
import { CreateFeedbackDto } from "./dto/create-feedback.dto.js";

export class FeedbackService {

    private readonly repository = new FeedbackRepository();

    async create(
        tenantId: string,
        dto: CreateFeedbackDto,
    ) {

        const id = await this.repository.create(tenantId, dto);

        return {
            id,
        };
    }

    async findAll(
        tenantId: string,
    ) {

        return this.repository.findAll(
            tenantId,
        );
    }
}