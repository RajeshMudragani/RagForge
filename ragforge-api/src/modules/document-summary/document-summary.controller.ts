import { Response, NextFunction } from "express";
import { successResponse } from "../../common/types/index.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";
import { DocumentSummaryService } from "./document-summary.service.js";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";

export class DocumentSummaryController {

    private readonly documentSummaryService = new DocumentSummaryService();

    listForTenant = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const summaries = await this.documentSummaryService.getSummariesForTenant(
                req.tenantId!,
            );
            res.status(HTTP_STATUS.OK).json(successResponse(summaries));
        } catch (error) {
            next(error);
        }
    };

    getSummary = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {

        try {

            const summary = await this.documentSummaryService.getSummaryForTenant(
                req.tenantId!,
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
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {

        try {

            const result = await this.documentSummaryService.enqueueSummary(
                req.tenantId!,
                String(req.params.documentId),
            );

            res
                .status(
                    HTTP_STATUS.ACCEPTED,
                )
                .json(
                    successResponse(
                        result,
                    ),
                );

        } catch (error) {
            next(error);
        }
    };
}