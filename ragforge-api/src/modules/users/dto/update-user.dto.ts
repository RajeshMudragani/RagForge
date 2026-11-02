import { z } from "zod";
import { UserRole } from "../users.constants.js";

export const UpdateUserDtoSchema =
    z.object({
        firstName:
            z.string()
                .optional(),

        lastName:
            z.string()
                .optional(),

        role:
            z.nativeEnum(
                UserRole,
            )
                .optional(),

        isActive:
            z.boolean()
                .optional(),
    });

export type UpdateUserDto =
    z.infer<
        typeof UpdateUserDtoSchema
    >;