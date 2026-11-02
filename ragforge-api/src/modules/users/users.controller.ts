import {
    Request,
    Response,
    NextFunction,
} from "express";
import { successResponse } from "../../common/types/index.js";
import { CreateUserDtoSchema } from "./dto/create-user.dto.js";
import { UpdateUserDtoSchema } from "./dto/update-user.dto.js";
import { UsersService } from "./users.service.js";

export class UsersController {

    private readonly service = new UsersService();

    create = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = CreateUserDtoSchema.parse(req.body);

            const id = await this.service.create(
                dto,
            );

            res.json(
                successResponse({
                    id,
                }),
            );

        } catch (
            error
        ) {
            next(error);
        }
    };

    findAll = async (
        _req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const users = await this.service.findAll();

            res.json(
                successResponse(
                    users,
                ),
            );

        } catch (
            error
        ) {
            next(error);
        }
    };

    findById = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const user = await this.service.findById(
                String(req.params.id),
            );

            res.json(
                successResponse(
                    user,
                ),
            );

        } catch (
            error
        ) {
            next(error);
        }
    };

    update = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = UpdateUserDtoSchema.parse(req.body);

            await this.service.update(
                String(req.params.id),
                dto,
            );

            res.json(
                successResponse(
                    null,
                ),
            );

        } catch (
            error
        ) {
            next(error);
        }
    };

    delete = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            await this.service.delete(
                String(req.params.id),
            );

            res.json(
                successResponse(
                    null,
                ),
            );

        } catch (
            error
        ) {
            next(error);
        }
    };
}