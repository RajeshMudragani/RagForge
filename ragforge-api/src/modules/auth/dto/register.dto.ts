import { z } from "zod";

export const RegisterDtoSchema = z.object({
        email: z.email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        tenantId: z.string().uuid().optional(),
    });

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
