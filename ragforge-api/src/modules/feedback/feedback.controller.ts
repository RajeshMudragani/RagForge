import {
    Request,
    Response,
    NextFunction,
} from "express";
import { successResponse } from "../../common/types/index.js";
import { FeedbackService } from "./feedback.service.js";
import { CreateFeedbackDtoSchema } from "./dto/create-feedback.dto.js";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";

export class FeedbackController {

    private readonly service = new FeedbackService();

    create = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = CreateFeedbackDtoSchema.parse(req.body);

            const result = await this.service.create(req.tenantId!, dto);

            res.json(
                successResponse(
                    result,
                ),
            );

        } catch (error) {
            next(
                error,
            );
        }
    };

    findAll = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const result = await this.service.findAll(req.tenantId!);

            res.json(
                successResponse(
                    result,
                ),
            );

        } catch (error) {
            next(
                error,
            );
        }
    };
}