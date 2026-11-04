import { NextFunction, Request, Response } from "express";
import { successResponse } from "../../common/types/index.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";
import { GenerateEmbeddingDtoSchema } from "./dto/generate-embedding.dto.js";
import { EMBEDDING_MODEL } from "./embeddings.constants.js";
import { EmbeddingsService } from "./embeddings.service.js";

export class EmbeddingsController {
    private readonly embeddingsService = new EmbeddingsService();

    generate = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const { text } = GenerateEmbeddingDtoSchema.parse(req.body);
            const result = await this.embeddingsService.generate(text);

            res.status(HTTP_STATUS.OK).json(successResponse({
                model: EMBEDDING_MODEL,
                dimensions: result.dimensions,
                embedding: result.embedding,
            }));
        } catch (error) {
            next(error);
        }
    };
}
