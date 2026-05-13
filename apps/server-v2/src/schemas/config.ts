import { z } from "zod";
import { identifierSchema, successResponseSchema, workspaceIdParamsSchema } from "./common.js";

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const workspaceConfigSnapshotSchema = z.object({
  effective: z.object({
    opencode: jsonRecordSchema,
    teamwork: jsonRecordSchema,
  }),
  materialized: z.object({
    compatibilityOpencodePath: z.string().nullable(),
    compatibilityTeamworkPath: z.string().nullable(),
    configDir: z.string().nullable(),
    configOpencodePath: z.string().nullable(),
    configTeamworkPath: z.string().nullable(),
  }),
  stored: z.object({
    opencode: jsonRecordSchema,
    teamwork: jsonRecordSchema,
  }),
  updatedAt: z.string(),
  workspaceId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2WorkspaceConfigSnapshot" });

export const workspaceConfigPatchRequestSchema = z.object({
  opencode: jsonRecordSchema.optional(),
  teamwork: jsonRecordSchema.optional(),
}).meta({ ref: "TeamWorkServerV2WorkspaceConfigPatchRequest" });

export const rawOpencodeConfigQuerySchema = z.object({
  scope: z.enum(["global", "project"]).optional(),
}).meta({ ref: "TeamWorkServerV2RawOpencodeConfigQuery" });

export const rawOpencodeConfigWriteRequestSchema = z.object({
  content: z.string(),
  scope: z.enum(["global", "project"]).optional(),
}).meta({ ref: "TeamWorkServerV2RawOpencodeConfigWriteRequest" });

export const rawOpencodeConfigDataSchema = z.object({
  content: z.string(),
  exists: z.boolean(),
  path: z.string().nullable(),
  updatedAt: z.string(),
}).meta({ ref: "TeamWorkServerV2RawOpencodeConfigData" });

export const workspaceConfigResponseSchema = successResponseSchema(
  "TeamWorkServerV2WorkspaceConfigResponse",
  workspaceConfigSnapshotSchema,
);

export const rawOpencodeConfigResponseSchema = successResponseSchema(
  "TeamWorkServerV2RawOpencodeConfigResponse",
  rawOpencodeConfigDataSchema,
);

export const rawOpencodeConfigParamsSchema = workspaceIdParamsSchema.meta({ ref: "TeamWorkServerV2RawOpencodeConfigParams" });
