import { z } from "zod";

export const requestIdSchema = z.string().min(1).meta({ ref: "TeamWorkServerV2RequestId" });

export const identifierSchema = z.string().min(1).max(200).meta({ ref: "TeamWorkServerV2Identifier" });

export const isoTimestampSchema = z.string().datetime({ offset: true }).meta({ ref: "TeamWorkServerV2IsoTimestamp" });

export const responseMetaSchema = z.object({
  requestId: requestIdSchema,
  timestamp: isoTimestampSchema,
}).meta({ ref: "TeamWorkServerV2ResponseMeta" });

export const workspaceIdParamsSchema = z.object({
  workspaceId: identifierSchema.describe("Stable TeamWork workspace identifier."),
}).meta({ ref: "TeamWorkServerV2WorkspaceIdParams" });

export const paginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).meta({ ref: "TeamWorkServerV2PaginationQuery" });

export function successResponseSchema<TSchema extends z.ZodTypeAny>(ref: string, data: TSchema) {
  return z.object({
    ok: z.literal(true),
    data,
    meta: responseMetaSchema,
  }).meta({ ref });
}
