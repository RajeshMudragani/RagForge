import { z } from "zod";

export const RefreshTokenDtoSchema = z.object({
    refreshToken: z.string().min(1),
});

export type RefreshTokenDto = z.infer<
    typeof RefreshTokenDtoSchema
>;