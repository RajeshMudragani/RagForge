import { Response, NextFunction } from "express";
import { RetrievalService } from "./retrieval.service.js";
import { SearchDtoSchema } from "./dto/search.dto.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";
import { successResponse } from "../../common/types/index.js";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";

export class RetrievalController {

    private readonly retrievalService = new RetrievalService();

    search = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {

        try {

            const dto = SearchDtoSchema.parse(req.body);

            const results = await this.retrievalService.search(
                dto.query,
                dto.limit,
                req.tenantId!,
                dto.collectionName,
                dto.metadata,
            );

            res.status(
                HTTP_STATUS.OK,
            ).json(
                successResponse(
                    results,
                ),
            );

        } catch (error) {
            next(error);
        }
    };

    context = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {

        try {

            const dto = SearchDtoSchema.parse(req.body);

            const context = await this.retrievalService.retrieveContext(
                dto.query,
                dto.limit,
                req.tenantId!,
                dto.collectionName,
                dto.metadata,
            );

            res.status(
                HTTP_STATUS.OK,
            ).json(
                successResponse(
                    context,
                ),
            );

        } catch (error) {
            next(error);
        }
    };
}
