import {
    Request,
    Response,
    NextFunction,
} from "express";
import { MetadataService } from "./metadata.service.js";
import { AddMetadataDtoSchema } from "./dto/add-metadata.dto.js";
import { BulkAddMetadataDtoSchema } from "./dto/bulk-add-metadata.dto.js";
import { successResponse } from "../../common/types/index.js";
import { HTTP_STATUS } from "../../constants/http.constants.js";

export class MetadataController {

    private readonly service = new MetadataService();

    add = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {

        try {

            const body = AddMetadataDtoSchema.parse(req.body);

            const result =
                await this.service
                    .add(
                        String(req.params.id),
                        body.key,
                        body.value,
                    );

            res
                .status(
                    HTTP_STATUS.CREATED,
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

    bulkAdd = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {

        try {

            const body = BulkAddMetadataDtoSchema.parse(req.body);

            const result = await this.service.bulkAdd(
                String(req.params.id),
                body.metadata,
            );

            res
                .status(
                    HTTP_STATUS.CREATED,
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

    getDocumentMetadata = async (
            req: Request,
            res: Response,
            next: NextFunction,
        ) => {

            try {

                const result = await this.service.getDocumentMetadata(String(req.params.id));

                res
                    .status(
                        HTTP_STATUS.OK,
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

    delete = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        try {

            await this.service.delete(
                String(req.params.id),
                String(req.params.key),
            );

            res
                .status(
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
}