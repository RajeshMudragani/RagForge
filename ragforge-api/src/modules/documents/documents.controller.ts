import { Request, Response, NextFunction } from "express";
import { DocumentsService } from "./documents.service.js";
import { IngestionService } from "../ingestion/ingestion.service.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";
import { successResponse } from "../../common/types/index.js";
import { BadRequestError } from "../../common/errors/index.js";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";
import { addSseClient, removeSseClient } from "./document-events.service.js";
import { UpdateDocumentDtoSchema } from "./dto/update-document.dto.js";

export class DocumentsController {
    private readonly documentsService = new DocumentsService();
    private readonly ingestionService = new IngestionService();

    upload = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {

        try {

            if (!req.file) {
                throw new BadRequestError(
                    "File is required",
                );
            }

            const collectionName = req.body.collectionName;

            const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : undefined;

            const document = await this.documentsService.upload(
                req.file,
                req.tenantId!,
                collectionName,
                metadata,
            );

            res.status(
                HTTP_STATUS.CREATED,
            ).json(
                successResponse(
                    document,
                ),
            );
        } catch (error) {
            next(error);
        }
    };

    assignCollection = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { documentIds, collectionId } = req.body as { documentIds: string[]; collectionId: string | null };
            if (!Array.isArray(documentIds) || documentIds.length === 0) {
                throw new BadRequestError("documentIds must be a non-empty array");
            }
            await this.documentsService.assignCollection(req.tenantId!, documentIds, collectionId ?? null);
            res.status(HTTP_STATUS.OK).json(successResponse({ updated: documentIds.length }));
        } catch (error) {
            next(error);
        }
    };

    findAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const documents = await this.documentsService.findAll(req.tenantId!);
            res.status(HTTP_STATUS.OK).json(successResponse(documents));
        } catch (error) {
            next(error);
        }
    };

    findById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const document = await this.documentsService.findById(req.tenantId!, String(req.params.id));
            res.status(HTTP_STATUS.OK).json(successResponse(document));
        } catch (error) {
            next(error);
        }
    };

    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body = UpdateDocumentDtoSchema.parse(req.body);
            const document = await this.documentsService.update(
                req.tenantId!,
                String(req.params.id),
                body,
            );
            res.status(HTTP_STATUS.OK).json(successResponse(document));
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.documentsService.delete(req.tenantId!, String(req.params.id));
            res.status(HTTP_STATUS.OK).json(successResponse({ deleted: true }));
        } catch (error) {
            next(error);
        }
    };

    process = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.ingestionService.process(req.params.id);
            res.status(HTTP_STATUS.OK).json(successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    async getStatus(
        req: AuthenticatedRequest<{ documentId: string }>,
        res: Response,
    ) {
        const tenantId = req.tenantId!;
        const { documentId } = req.params;

        const status = await this.documentsService.getStatus(
            tenantId,
            documentId,
        );

        res.json({
            success: true,
            data: status,
        });
    }

    streamEvents = (req: AuthenticatedRequest, res: Response): void => {
        const tenantId = req.tenantId!;

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        // Keep-alive ping every 25s to prevent proxy timeouts
        const ping = setInterval(() => res.write(": ping\n\n"), 25_000);

        addSseClient(tenantId, res);

        req.on("close", () => {
            clearInterval(ping);
            removeSseClient(tenantId, res);
        });
    };
}
