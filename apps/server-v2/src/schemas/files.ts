import { z } from "zod";
import { identifierSchema, successResponseSchema, workspaceIdParamsSchema } from "./common.js";

const fileSessionIdParamsSchema = workspaceIdParamsSchema.extend({
  fileSessionId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2FileSessionIdParams" });

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const workspaceActivationDataSchema = z.object({
  activeWorkspaceId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2WorkspaceActivationData" });

export const engineReloadDataSchema = z.object({
  reloadedAt: z.number().int().nonnegative(),
}).meta({ ref: "TeamWorkServerV2EngineReloadData" });

export const workspaceDeleteDataSchema = z.object({
  deleted: z.boolean(),
  workspaceId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2WorkspaceDeleteData" });

export const workspaceDisposeDataSchema = z.object({
  disposed: z.boolean(),
  workspaceId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2WorkspaceDisposeData" });

export const workspaceCreateLocalRequestSchema = z.object({
  folderPath: z.string().min(1),
  name: z.string().min(1),
  preset: z.string().min(1).optional(),
}).meta({ ref: "TeamWorkServerV2WorkspaceCreateLocalRequest" });

export const reloadEventSchema = z.object({
  id: identifierSchema,
  reason: z.enum(["agents", "commands", "config", "mcp", "plugins", "skills"]),
  seq: z.number().int().nonnegative(),
  timestamp: z.number().int().nonnegative(),
  trigger: z.object({
    action: z.enum(["added", "removed", "updated"]).optional(),
    name: z.string().optional(),
    path: z.string().optional(),
    type: z.enum(["agent", "command", "config", "mcp", "plugin", "skill"]),
  }).optional(),
  workspaceId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2ReloadEvent" });

export const reloadEventsDataSchema = z.object({
  cursor: z.number().int().nonnegative(),
  items: z.array(reloadEventSchema),
}).meta({ ref: "TeamWorkServerV2ReloadEventsData" });

export const fileSessionCreateRequestSchema = z.object({
  ttlSeconds: z.number().positive().optional(),
  write: z.boolean().optional(),
}).meta({ ref: "TeamWorkServerV2FileSessionCreateRequest" });

export const fileSessionDataSchema = z.object({
  canWrite: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  id: identifierSchema,
  ttlMs: z.number().int().nonnegative(),
  workspaceId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2FileSessionData" });

export const fileCatalogSnapshotSchema = z.object({
  cursor: z.number().int().nonnegative(),
  generatedAt: z.number().int().nonnegative(),
  items: z.array(z.object({
    kind: z.enum(["dir", "file"]),
    mtimeMs: z.number(),
    path: z.string(),
    revision: z.string(),
    size: z.number().int().nonnegative(),
  })),
  nextAfter: z.string().optional(),
  sessionId: identifierSchema,
  total: z.number().int().nonnegative(),
  truncated: z.boolean(),
  workspaceId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2FileCatalogSnapshot" });

export const fileBatchReadRequestSchema = z.object({
  paths: z.array(z.string()).min(1),
}).meta({ ref: "TeamWorkServerV2FileBatchReadRequest" });

export const fileBatchReadResponseSchema = successResponseSchema(
  "TeamWorkServerV2FileBatchReadResponse",
  z.object({ items: z.array(jsonRecordSchema) }),
);

export const fileBatchWriteRequestSchema = z.object({
  writes: z.array(jsonRecordSchema).min(1),
}).meta({ ref: "TeamWorkServerV2FileBatchWriteRequest" });

export const fileOperationsRequestSchema = z.object({
  operations: z.array(jsonRecordSchema).min(1),
}).meta({ ref: "TeamWorkServerV2FileOperationsRequest" });

export const fileMutationResultSchema = successResponseSchema(
  "TeamWorkServerV2FileMutationResult",
  z.object({
    cursor: z.number().int().nonnegative(),
    items: z.array(jsonRecordSchema),
  }),
);

export const simpleContentQuerySchema = z.object({
  path: z.string().min(1),
}).meta({ ref: "TeamWorkServerV2SimpleContentQuery" });

export const simpleContentWriteRequestSchema = z.object({
  baseUpdatedAt: z.number().nullable().optional(),
  content: z.string(),
  force: z.boolean().optional(),
  path: z.string().min(1),
}).meta({ ref: "TeamWorkServerV2SimpleContentWriteRequest" });

export const simpleContentDataSchema = z.object({
  bytes: z.number().int().nonnegative(),
  content: z.string(),
  path: z.string(),
  revision: z.string().optional(),
  updatedAt: z.number(),
}).meta({ ref: "TeamWorkServerV2SimpleContentData" });

export const binaryItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  path: z.string(),
  size: z.number().int().nonnegative(),
  updatedAt: z.number(),
}).meta({ ref: "TeamWorkServerV2BinaryItem" });

export const binaryListResponseSchema = successResponseSchema(
  "TeamWorkServerV2BinaryListResponse",
  z.object({ items: z.array(binaryItemSchema) }),
);

export const binaryUploadDataSchema = z.object({
  bytes: z.number().int().nonnegative(),
  path: z.string(),
}).meta({ ref: "TeamWorkServerV2BinaryUploadData" });

export const workspaceActivationResponseSchema = successResponseSchema(
  "TeamWorkServerV2WorkspaceActivationResponse",
  workspaceActivationDataSchema,
);

export const engineReloadResponseSchema = successResponseSchema(
  "TeamWorkServerV2EngineReloadResponse",
  engineReloadDataSchema,
);

export const workspaceDeleteResponseSchema = successResponseSchema(
  "TeamWorkServerV2WorkspaceDeleteResponse",
  workspaceDeleteDataSchema,
);

export const workspaceDisposeResponseSchema = successResponseSchema(
  "TeamWorkServerV2WorkspaceDisposeResponse",
  workspaceDisposeDataSchema,
);

export const reloadEventsResponseSchema = successResponseSchema(
  "TeamWorkServerV2ReloadEventsResponse",
  reloadEventsDataSchema,
);

export const fileSessionResponseSchema = successResponseSchema(
  "TeamWorkServerV2FileSessionResponse",
  fileSessionDataSchema,
);

export const fileCatalogSnapshotResponseSchema = successResponseSchema(
  "TeamWorkServerV2FileCatalogSnapshotResponse",
  fileCatalogSnapshotSchema,
);

export const simpleContentResponseSchema = successResponseSchema(
  "TeamWorkServerV2SimpleContentResponse",
  simpleContentDataSchema,
);

export const binaryUploadResponseSchema = successResponseSchema(
  "TeamWorkServerV2BinaryUploadResponse",
  binaryUploadDataSchema,
);

export { fileSessionIdParamsSchema };
