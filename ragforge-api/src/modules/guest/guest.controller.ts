import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";
import { BadRequestError } from "../../common/errors/index.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";
import { successResponse } from "../../common/types/index.js";
import { ChatService } from "../chat/chat.service.js";
import { ChatDtoSchema } from "../chat/dto/chat.dto.js";
import { DocumentsService } from "../documents/documents.service.js";
import { GuestRequest } from "./guest-session.middleware.js";
import { GuestSessionService } from "./guest-session.service.js";
import { logger } from "../../logger/logger.js";
import { ConversationService } from "../conversation/conversation.service.js";
import { NotFoundError } from "../../common/errors/index.js";

const MAX_GUEST_FILE_SIZE = 10 * 1024 * 1024;
const MAX_GUEST_FILES = 3;

export class GuestController {
    private readonly sessions = new GuestSessionService();
    private readonly documents = new DocumentsService();
    private readonly chat = new ChatService();
    private readonly conversations = new ConversationService();

    createSession = async (
        _req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const session = await this.sessions.create();
            res.status(HTTP_STATUS.CREATED).json(successResponse(session));
        } catch (error) {
            next(error);
        }
    };

    upload = async (
        req: GuestRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        let reservationMade = false;
        try {
            if (!req.file) throw new BadRequestError("File is required");
            if (req.file.size > MAX_GUEST_FILE_SIZE) {
                throw new BadRequestError("Guest uploads are limited to 10 MB per file.");
            }

            reservationMade = await this.sessions.reserveUpload(req.guestSessionId!);
            if (!reservationMade) {
                throw new BadRequestError(`Guest sessions can upload up to ${MAX_GUEST_FILES} files.`);
            }

            const document = await this.documents.upload(req.file, req.tenantId!);
            res.status(HTTP_STATUS.CREATED).json(successResponse(document));
        } catch (error) {
            if (reservationMade) {
                try {
                    await this.sessions.releaseUpload(req.guestSessionId!);
                } catch (releaseError) {
                    logger.error(
                        { err: releaseError, guestSessionId: req.guestSessionId },
                        "Failed to release guest upload reservation",
                    );
                }
            }
            next(error);
        }
    };

    listDocuments = async (
        req: GuestRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const documents = await this.documents.findAll(req.tenantId!);
            res.status(HTTP_STATUS.OK).json(successResponse(documents));
        } catch (error) {
            next(error);
        }
    };

    deleteDocument = async (
        req: GuestRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            await this.documents.delete(req.tenantId!, String(req.params.id));
            try {
                await this.sessions.releaseUpload(req.guestSessionId!);
            } catch (error) {
                logger.error(
                    { err: error, guestSessionId: req.guestSessionId },
                    "Failed to release guest upload reservation after document deletion",
                );
            }
            res.status(HTTP_STATUS.OK).json(successResponse({ deleted: true }));
        } catch (error) {
            next(error);
        }
    };

    deleteAllData = async (
        req: GuestRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const documents = await this.documents.findAll(req.tenantId!);
            const processingDocument = documents.find(document =>
                document.status === "PENDING" ||
                document.status === "PROCESSING" ||
                document.status === "EMBEDDING",
            );
            if (processingDocument) {
                throw new BadRequestError("Wait for all trial documents to finish processing before deleting all trial data.");
            }

            for (const document of documents) {
                await this.documents.delete(req.tenantId!, document.id);
            }
            await this.conversations.deleteAllForTenant(req.tenantId!);
            await this.sessions.resetUploadCount(req.guestSessionId!);

            res.status(HTTP_STATUS.OK).json(successResponse({ deleted: true }));
        } catch (error) {
            next(error);
        }
    };

    getConversation = async (
        req: GuestRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const result = await this.conversations.getConversationById(
                req.tenantId!,
                String(req.params.id),
            );
            if (!result.conversation) throw new NotFoundError("Conversation");
            res.status(HTTP_STATUS.OK).json(successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    chatMessage = async (
        req: GuestRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const dto = ChatDtoSchema.parse(req.body);
            const result = await this.chat.chat(
                dto.question,
                dto.topK,
                dto.promptType,
                req.tenantId!,
                dto.conversationId,
                undefined,
                undefined,
                false,
                false,
            );
            res.status(HTTP_STATUS.OK).json(successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    streamChatMessage = async (
        req: GuestRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        const abortController = new AbortController();
        let heartbeat: NodeJS.Timeout | undefined;
        res.on("close", () => {
            if (!res.writableEnded) abortController.abort();
        });

        try {
            const dto = ChatDtoSchema.parse(req.body);

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders();
            res.write("event: ready\n");
            res.write('data: {"status":"connected"}\n\n');
            heartbeat = setInterval(() => {
                if (!res.writableEnded) res.write(": keepalive\n\n");
            }, 15_000);

            const result = await this.chat.streamChat(
                dto.question,
                dto.topK,
                dto.promptType,
                req.tenantId!,
                (token: string) => {
                    res.write("event: token\n");
                    res.write(`data: ${JSON.stringify(token)}\n\n`);
                },
                abortController.signal,
                dto.conversationId,
                undefined,
                undefined,
                false,
            );

            res.write("event: done\n");
            res.write(`data: ${JSON.stringify({
                answer: result.answer,
                conversationId: result.conversationId,
                sources: result.sources,
            })}\n\n`);
            res.end();
        } catch (error) {
            if (abortController.signal.aborted) {
                if (!res.writableEnded) res.end();
                return;
            }
            if (!res.headersSent) {
                next(error);
                return;
            }

            if (res.destroyed || res.writableEnded) return;
            const requestId = req.headers["x-request-id"];
            res.write("event: error\n");
            res.write(`data: ${JSON.stringify({
                message: "Unable to complete the chat response.",
                ...(typeof requestId === "string" ? { requestId } : {}),
            })}\n\n`);
            res.end();
        } finally {
            if (heartbeat) clearInterval(heartbeat);
        }
    };
}

export { MAX_GUEST_FILE_SIZE };
