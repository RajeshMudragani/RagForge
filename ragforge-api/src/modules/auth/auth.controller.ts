import {
    Request,
    Response,
    NextFunction,
} from "express";
import { successResponse } from "../../common/types/index.js";
import { AuthService } from "./auth.service.js";
import { RegisterDtoSchema } from "./dto/register.dto.js";
import { LoginDtoSchema } from "./dto/login.dto.js";
import { AuthenticatedRequest } from "./interfaces/authenticated-request.interface.js";
import { RefreshTokenDtoSchema } from "./dto/refresh-token.dto.js";

export class AuthController {

    private readonly service = new AuthService();

    register = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = RegisterDtoSchema.parse(req.body);

            const result = await this.service.register(dto);

            res.json(
                successResponse(
                    result,
                ),
            );

        } catch (error) {
            next(error);
        }
    };

    login = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = LoginDtoSchema.parse(req.body);

            const result = await this.service.login(dto);

            res.json(
                successResponse(
                    result,
                ),
            );

        } catch (error) {
            next(error);
        }
    };

    me = async (
        req: AuthenticatedRequest,
        res: Response,
    ) => {

        res.json(
            successResponse(
                req.user,
            ),
        );
    };

    refresh = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = RefreshTokenDtoSchema.parse(req.body);

            const tokens = await this.service.refresh(dto.refreshToken);

            res.json(
                successResponse(
                    tokens,
                ),
            );

        } catch (error) {
            next(
                error,
            );
        }
    };

    logout = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            const dto = RefreshTokenDtoSchema.parse(req.body);

            await this.service.logout(dto.refreshToken);

            res.json(
                successResponse(
                    null,
                ),
            );

        } catch (error) {
            next(
                error,
            );
        }
    };

    logoutAll = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            await this.service.logoutAll(req.user!.sub);

            res.json(
                successResponse(
                    null,
                ),
            );

        } catch (error) {
            next(
                error,
            );
        }
    };
}