import { Request, Response, NextFunction } from "express";
import { ChatService } from "./chat.service.js";
import { ChatDtoSchema } from "./dto/chat.dto.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";
import { successResponse } from "../../common/types/index.js";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";

export class ChatController {
    private readonly chatService = new ChatService();

    chat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dto = ChatDtoSchema.parse(req.body);
            const result = await this.chatService.chat(
                dto.question,
                dto.topK,
                dto.promptType,
                req.tenantId!,
                dto.conversationId,
                dto.collectionName,
                dto.metadata,
            );
            res.status(HTTP_STATUS.OK).json(successResponse(result));
        } catch (error) {
            next(error);
        }
    };

    stream = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        const abortController = new AbortController();
        req.on("close", () => abortController.abort());

        try {
            const dto = ChatDtoSchema.parse(req.body);

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders();

            const result = await this.chatService.streamChat(
                dto.question,
                dto.topK,
                dto.promptType,
                req.tenantId!,
                (token: string) => {
                    res.write(`event: token\n`);
                    res.write(`data: ${JSON.stringify(token)}\n\n`);
                },
                abortController.signal,
                dto.conversationId,
                dto.collectionName,
                dto.metadata,
            );

            res.write(`event: done\n`);
            res.write(`data: ${JSON.stringify({
                answer: result.answer,
                conversationId: result.conversationId,
                sources: result.sources,
            })}\n\n`);
            res.end();
        } catch (error) {
            if ((error as Error).message === "Aborted") { res.end(); return; }
            next(error);
        }
    };
}
