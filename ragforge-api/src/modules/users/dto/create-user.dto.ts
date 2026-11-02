import { z } from "zod";
import { UserRole } from "../users.constants.js";

export const CreateUserDtoSchema = z.object({
        email: z.email(),
        passwordHash: z.string().min(1),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.nativeEnum(UserRole).default(UserRole.USER),
        tenantId: z.string().uuid(),

    });

export type CreateUserDto =
    z.infer<
        typeof CreateUserDtoSchema
    >;