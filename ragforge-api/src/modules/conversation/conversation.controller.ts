import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";
import { ConversationService } from "./conversation.service.js";
import { successResponse } from "../../common/types/index.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";
import { RenameConversationDtoSchema } from "./dto/rename-conversation.dto.js";
import { ListConversationsDtoSchema } from "./dto/list-conversations.dto.js";

export class ConversationController {

    private readonly service = new ConversationService();

    getConversations = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const {
                page,
                pageSize,
                search,
            } = ListConversationsDtoSchema.parse(req.query);

            const result = await this.service.getConversations(
                req.tenantId!,
                page,
                pageSize,
                search,
            );

            res.status(
                HTTP_STATUS.OK,
            )
            .json(
                successResponse({
                    items: result.items,
                    page,
                    pageSize,
                    total: result.total,
                }),
            );

        } catch (error) {
            next(error);
        }
    };

    getConversationById = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const result = await this.service.getConversationById(
                req.tenantId!,
                String(req.params.id),
            );

            res.status(HTTP_STATUS.OK)
                .json(
                    successResponse(
                        result,
                    ),
                );

        } catch (error) {
            next(error);
        }
    };

    deleteConversation = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            await this.service.deleteConversation(req.tenantId!, String(req.params.id));

            res.status(
                    HTTP_STATUS.OK,
                )
                .json(
                    successResponse({
                        deleted: true,
                    }),
                );

        } catch (error) {
            next(error);
        }
    };

    renameConversation = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const body = RenameConversationDtoSchema.parse(req.body);

            await this.service.renameConversation(
                req.tenantId!,
                String(req.params.id),
                body.title,
            );

            res.status(
                HTTP_STATUS.OK,
            )
            .json(
                successResponse({
                    updated: true,
                }),
            );

        } catch (error) {
            next(error);
        }
    };
}