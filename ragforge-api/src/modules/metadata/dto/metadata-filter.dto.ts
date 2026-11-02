import { z } from "zod";

export const MetadataFilterDtoSchema =
    z.record(
        z.string(),
        z.string(),
    );

export type MetadataFilterDto =
    z.infer<
        typeof MetadataFilterDtoSchema
    >;