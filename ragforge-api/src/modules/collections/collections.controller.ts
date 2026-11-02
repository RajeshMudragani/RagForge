import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface.js";
import { CollectionsService } from "./collections.service.js";
import { CreateCollectionDtoSchema } from "./dto/create-collection.dto.js";
import { UpdateCollectionDtoSchema } from "./dto/update-collection.dto.js";
import { successResponse } from "../../common/types/index.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";

export class CollectionsController {

    private readonly service = new CollectionsService();

    create = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const body = CreateCollectionDtoSchema.parse(req.body);

            const id = await this.service.create(
                req.tenantId!,
                body.name,
                body.description,
            );

            res.status(
                HTTP_STATUS.CREATED,
            ).json(
                successResponse({
                    id,
                }),
            );

        } catch (error) {
            next(error);
        }
    };

    getAll = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const collections = await this.service.getAll(req.tenantId!);

            res.status(
                HTTP_STATUS.OK,
            ).json(
                successResponse({
                    items: collections,
                }),
            );

        } catch (error) {
            next(error);
        }
    };

    getById = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const result = await this.service.getById(
                req.tenantId!,
                String(
                    req.params.id,
                ),
            );

            res.status(
                HTTP_STATUS.OK,
            ).json(
                successResponse(
                    result,
                ),
            );

        } catch (error) {
            next(error);
        }
    };

    update = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const body = UpdateCollectionDtoSchema.parse(req.body);

            await this.service.update(
                req.tenantId!,
                String(
                    req.params.id,
                ),
                body,
            );

            res.status(
                HTTP_STATUS.OK,
            ).json(
                successResponse({
                    updated: true,
                }),
            );

        } catch (error) {
            next(error);
        }
    };

    delete = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            await this.service.delete(
                req.tenantId!,
                String(req.params.id),
            );

            res.status(
                HTTP_STATUS.OK,
            ).json(
                successResponse({
                    deleted: true,
                }),
            );

        } catch (error) {
            next(error);
        }
    };

    getStats = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const stats = await this.service.getStats(
                req.tenantId!,
                String(req.params.id),
            );

            res.status(
                HTTP_STATUS.OK,
            ).json(
                successResponse({
                    items: stats,
                }),
            );

        } catch (error) {
            next(error);
        }
    };
}