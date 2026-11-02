import {
    Request,
    Response,
    NextFunction,
} from "express";
import { EvaluationService } from "./evaluation.service.js";
import { CreateEvaluationDtoSchema } from "./dto/create-evaluation.dto.js";
import { successResponse } from "../../common/types/index.js";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";

export class EvaluationController {

    private readonly service = new EvaluationService();

    run = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = CreateEvaluationDtoSchema.parse(req.body);

            const result = await this.service.queueEvaluation(
                dto.question,
                dto.expectedAnswer,
                dto.topK,
                req.tenantId!,
            );


            res.json(
                successResponse(
                    result,
                ),
            );

        } catch (
            error
        ) {

            next(
                error,
            );
        }
    };

    history = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const result = await this.service.getHistory(req.tenantId!);

            res.json(
                successResponse(
                    result,
                ),
            );

        } catch (
            error
        ) {
            next(
                error,
            );
        }
    };
}