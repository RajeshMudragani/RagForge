import {
    Request,
    Response,
    NextFunction,
} from "express";
import { successResponse } from "../../common/types/index.js";
import { CreateTenantDtoSchema } from "./dto/create-tenant.dto.js";
import { UpdateTenantDtoSchema } from "./dto/update-tenant.dto.js";
import { TenantsService } from "./tenants.service.js";

export class TenantsController {

    private readonly service = new TenantsService();

    create = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = CreateTenantDtoSchema.parse(req.body);

            const id = await this.service.create(dto);

            res.json(
                successResponse({
                    id,
                }),
            );

        } catch (error) {
            next(error);
        }
    };

    findAll = async (
        _req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const tenants = await this.service.findAll();

            res.json(
                successResponse(
                    tenants,
                ),
            );

        } catch (error) {
            next(error);
        }
    };

    findById = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const tenant = await this.service.findById(String(req.params.id));

            res.json(
                successResponse(
                    tenant,
                ),
            );

        } catch (error) {
            next(error);
        }
    };

    update = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = UpdateTenantDtoSchema.parse(req.body);

            await this.service.update(
                String(req.params.id),
                dto,
            );

            res.json(
                successResponse(
                    null,
                ),
            );

        } catch (error) {
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

        } catch (error) {
            next(error);
        }
    };
}
