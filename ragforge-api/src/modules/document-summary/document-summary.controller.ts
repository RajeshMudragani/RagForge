import {
    Request,
    Response,
    NextFunction,
} from "express";
import { successResponse } from "../../common/types/index.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";
import { DocumentSummaryService } from "./document-summary.service.js";

export class DocumentSummaryController {

    private readonly documentSummaryService = new DocumentSummaryService();

    getSummary = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {

        try {

            const summary = await this.documentSummaryService.getSummary(
                String(req.params.documentId),
            );

            res
                .status(
                    HTTP_STATUS.OK,
                )
                .json(
                    successResponse(
                        summary,
                    ),
                );

        } catch (error) {
            next(error);
        }
    };

    regenerateSummary = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {

        try {

            const summary = await this.documentSummaryService.regenerateSummary(
                String(req.params.documentId),
            );

            res
                .status(
                    HTTP_STATUS.OK,
                )
                .json(
                    successResponse(
                        summary,
                    ),
                );

        } catch (error) {
            next(error);
        }
    };
}