import { z } from "zod";
import { identifierSchema, isoTimestampSchema, successResponseSchema, workspaceIdParamsSchema } from "./common.js";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const managedKindSchema = z.enum(["mcps", "plugins", "providerConfigs", "skills"]);

export const managedItemSchema = z.object({
  auth: jsonObjectSchema.nullable(),
  cloudItemId: z.string().nullable(),
  config: jsonObjectSchema,
  createdAt: isoTimestampSchema,
  displayName: z.string(),
  id: identifierSchema,
  key: z.string().nullable(),
  metadata: jsonObjectSchema.nullable(),
  source: z.enum(["cloud_synced", "discovered", "imported", "teamwork_managed"]),
  updatedAt: isoTimestampSchema,
  workspaceIds: z.array(identifierSchema),
}).meta({ ref: "TeamWorkServerV2ManagedItem" });

export const managedItemWriteSchema = z.object({
  auth: jsonObjectSchema.nullable().optional(),
  cloudItemId: z.string().nullable().optional(),
  config: jsonObjectSchema.optional(),
  displayName: z.string(),
  key: z.string().nullable().optional(),
  metadata: jsonObjectSchema.nullable().optional(),
  source: z.enum(["cloud_synced", "discovered", "imported", "teamwork_managed"]).optional(),
  workspaceIds: z.array(identifierSchema).optional(),
}).meta({ ref: "TeamWorkServerV2ManagedItemWrite" });

export const managedAssignmentWriteSchema = z.object({
  workspaceIds: z.array(identifierSchema),
}).meta({ ref: "TeamWorkServerV2ManagedAssignmentWrite" });

export const managedItemListResponseSchema = successResponseSchema(
  "TeamWorkServerV2ManagedItemListResponse",
  z.object({ items: z.array(managedItemSchema) }),
);
export const managedItemResponseSchema = successResponseSchema("TeamWorkServerV2ManagedItemResponse", managedItemSchema);
export const managedDeleteResponseSchema = successResponseSchema(
  "TeamWorkServerV2ManagedDeleteResponse",
  z.object({ deleted: z.boolean(), id: identifierSchema }),
);

export const workspaceMcpItemSchema = z.object({
  config: jsonObjectSchema,
  disabledByTools: z.boolean().optional(),
  name: z.string(),
  source: z.enum(["config.global", "config.project", "config.remote"]),
}).meta({ ref: "TeamWorkServerV2WorkspaceMcpItem" });
export const workspaceMcpListResponseSchema = successResponseSchema(
  "TeamWorkServerV2WorkspaceMcpListResponse",
  z.object({ items: z.array(workspaceMcpItemSchema) }),
);
export const workspaceMcpWriteSchema = z.object({
  config: jsonObjectSchema,
  name: z.string(),
}).meta({ ref: "TeamWorkServerV2WorkspaceMcpWrite" });

export const workspacePluginItemSchema = z.object({
  path: z.string().optional(),
  scope: z.enum(["global", "project"]),
  source: z.enum(["config", "dir.project", "dir.global"]),
  spec: z.string(),
}).meta({ ref: "TeamWorkServerV2WorkspacePluginItem" });
export const workspacePluginListResponseSchema = successResponseSchema(
  "TeamWorkServerV2WorkspacePluginListResponse",
  z.object({ items: z.array(workspacePluginItemSchema), loadOrder: z.array(z.string()) }),
);
export const workspacePluginWriteSchema = z.object({ spec: z.string() }).meta({ ref: "TeamWorkServerV2WorkspacePluginWrite" });

export const workspaceSkillItemSchema = z.object({
  description: z.string(),
  name: z.string(),
  path: z.string(),
  scope: z.enum(["global", "project"]),
  trigger: z.string().optional(),
}).meta({ ref: "TeamWorkServerV2WorkspaceSkillItem" });
export const workspaceSkillContentSchema = z.object({
  content: z.string(),
  item: workspaceSkillItemSchema,
}).meta({ ref: "TeamWorkServerV2WorkspaceSkillContent" });
export const workspaceSkillListResponseSchema = successResponseSchema(
  "TeamWorkServerV2WorkspaceSkillListResponse",
  z.object({ items: z.array(workspaceSkillItemSchema) }),
);
export const workspaceSkillResponseSchema = successResponseSchema("TeamWorkServerV2WorkspaceSkillResponse", workspaceSkillContentSchema);
export const workspaceSkillWriteSchema = z.object({
  content: z.string(),
  description: z.string().optional(),
  name: z.string(),
  trigger: z.string().optional(),
}).meta({ ref: "TeamWorkServerV2WorkspaceSkillWrite" });
export const workspaceSkillDeleteResponseSchema = successResponseSchema(
  "TeamWorkServerV2WorkspaceSkillDeleteResponse",
  z.object({ path: z.string() }),
);

export const hubRepoSchema = z.object({
  owner: z.string().optional(),
  ref: z.string().optional(),
  repo: z.string().optional(),
}).meta({ ref: "TeamWorkServerV2HubRepo" });
export const hubSkillItemSchema = z.object({
  description: z.string(),
  name: z.string(),
  source: z.object({ owner: z.string(), path: z.string(), ref: z.string(), repo: z.string() }),
  trigger: z.string().optional(),
}).meta({ ref: "TeamWorkServerV2HubSkillItem" });
export const hubSkillListResponseSchema = successResponseSchema(
  "TeamWorkServerV2HubSkillListResponse",
  z.object({ items: z.array(hubSkillItemSchema) }),
);
export const hubSkillInstallWriteSchema = z.object({
  overwrite: z.boolean().optional(),
  repo: hubRepoSchema.optional(),
}).meta({ ref: "TeamWorkServerV2HubSkillInstallWrite" });
export const hubSkillInstallResponseSchema = successResponseSchema(
  "TeamWorkServerV2HubSkillInstallResponse",
  z.object({
    action: z.enum(["added", "updated"]),
    name: z.string(),
    path: z.string(),
    skipped: z.number().int().nonnegative(),
    written: z.number().int().nonnegative(),
  }),
);

export const cloudSigninSchema = z.object({
  auth: jsonObjectSchema.nullable(),
  cloudBaseUrl: z.string(),
  createdAt: isoTimestampSchema,
  id: identifierSchema,
  lastValidatedAt: isoTimestampSchema.nullable(),
  metadata: jsonObjectSchema.nullable(),
  orgId: z.string().nullable(),
  serverId: identifierSchema,
  updatedAt: isoTimestampSchema,
  userId: z.string().nullable(),
}).meta({ ref: "TeamWorkServerV2CloudSignin" });
export const cloudSigninWriteSchema = z.object({
  auth: jsonObjectSchema.nullable().optional(),
  cloudBaseUrl: z.string(),
  metadata: jsonObjectSchema.nullable().optional(),
  orgId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
}).meta({ ref: "TeamWorkServerV2CloudSigninWrite" });
export const cloudSigninResponseSchema = successResponseSchema("TeamWorkServerV2CloudSigninResponse", cloudSigninSchema.nullable());
export const cloudSigninValidationResponseSchema = successResponseSchema(
  "TeamWorkServerV2CloudSigninValidationResponse",
  z.object({ lastValidatedAt: isoTimestampSchema.nullable(), ok: z.boolean(), record: cloudSigninSchema }),
);

export const workspaceShareSchema = z.object({
  accessKey: z.string().nullable(),
  audit: jsonObjectSchema.nullable(),
  createdAt: isoTimestampSchema,
  id: identifierSchema,
  lastUsedAt: isoTimestampSchema.nullable(),
  revokedAt: isoTimestampSchema.nullable(),
  status: z.enum(["active", "disabled", "revoked"]),
  updatedAt: isoTimestampSchema,
  workspaceId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2WorkspaceShare" });
export const workspaceShareResponseSchema = successResponseSchema("TeamWorkServerV2WorkspaceShareResponse", workspaceShareSchema.nullable());

export const workspaceExportWarningSchema = z.object({
  detail: z.string(),
  id: z.string(),
  label: z.string(),
}).meta({ ref: "TeamWorkServerV2WorkspaceExportWarning" });
export const workspaceExportDataSchema = z.object({
  commands: z.array(z.object({ description: z.string().optional(), name: z.string(), template: z.string() })),
  exportedAt: z.number().int().nonnegative(),
  files: z.array(z.object({ content: z.string(), path: z.string() })).optional(),
  teamwork: jsonObjectSchema,
  opencode: jsonObjectSchema,
  skills: z.array(z.object({ content: z.string(), description: z.string().optional(), name: z.string(), trigger: z.string().optional() })),
  workspaceId: identifierSchema,
}).meta({ ref: "TeamWorkServerV2WorkspaceExportData" });
export const workspaceExportResponseSchema = successResponseSchema("TeamWorkServerV2WorkspaceExportResponse", workspaceExportDataSchema);
export const workspaceImportWriteSchema = z.record(z.string(), z.unknown()).meta({ ref: "TeamWorkServerV2WorkspaceImportWrite" });
export const workspaceImportResponseSchema = successResponseSchema("TeamWorkServerV2WorkspaceImportResponse", z.object({ ok: z.boolean() }));

export const sharedBundlePublishWriteSchema = z.object({
  bundleType: z.string(),
  name: z.string().optional(),
  payload: z.unknown(),
  timeoutMs: z.number().int().positive().optional(),
}).meta({ ref: "TeamWorkServerV2SharedBundlePublishWrite" });
export const sharedBundleFetchWriteSchema = z.object({
  bundleUrl: z.string(),
  timeoutMs: z.number().int().positive().optional(),
}).meta({ ref: "TeamWorkServerV2SharedBundleFetchWrite" });
export const sharedBundlePublishResponseSchema = successResponseSchema(
  "TeamWorkServerV2SharedBundlePublishResponse",
  z.object({ url: z.string() }),
);
export const sharedBundleFetchResponseSchema = successResponseSchema(
  "TeamWorkServerV2SharedBundleFetchResponse",
  z.record(z.string(), z.unknown()),
);

export const routerIdentityItemSchema = z.object({
  access: z.enum(["private", "public"]).optional(),
  enabled: z.boolean(),
  id: z.string(),
  pairingRequired: z.boolean().optional(),
  running: z.boolean(),
}).meta({ ref: "TeamWorkServerV2RouterIdentityItem" });
export const routerHealthSnapshotSchema = z.object({
  config: z.object({ groupsEnabled: z.boolean() }),
  channels: z.object({ slack: z.boolean(), telegram: z.boolean(), whatsapp: z.boolean() }),
  ok: z.boolean(),
  opencode: z.object({ healthy: z.boolean(), url: z.string(), version: z.string().optional() }),
}).meta({ ref: "TeamWorkServerV2RouterHealthSnapshot" });
export const routerIdentityListResponseSchema = successResponseSchema(
  "TeamWorkServerV2RouterIdentityListResponse",
  z.object({ items: z.array(routerIdentityItemSchema), ok: z.boolean() }),
);
export const routerTelegramInfoResponseSchema = successResponseSchema(
  "TeamWorkServerV2RouterTelegramInfoResponse",
  z.object({
    bot: z.object({ id: z.number().int(), name: z.string().optional(), username: z.string().optional() }).nullable(),
    configured: z.boolean(),
    enabled: z.boolean(),
    ok: z.boolean(),
  }),
);
export const routerHealthResponseSchemaCompat = successResponseSchema("TeamWorkServerV2RouterHealthCompatResponse", routerHealthSnapshotSchema);
export const routerTelegramWriteSchema = z.object({ access: z.enum(["private", "public"]).optional(), enabled: z.boolean().optional(), id: z.string().optional(), token: z.string() }).meta({ ref: "TeamWorkServerV2RouterTelegramWrite" });
export const routerSlackWriteSchema = z.object({ appToken: z.string(), botToken: z.string(), enabled: z.boolean().optional(), id: z.string().optional() }).meta({ ref: "TeamWorkServerV2RouterSlackWrite" });
export const routerBindingWriteSchema = z.object({ channel: z.enum(["slack", "telegram"]), directory: z.string().optional(), identityId: z.string().optional(), peerId: z.string() }).meta({ ref: "TeamWorkServerV2RouterBindingWrite" });
export const routerBindingListResponseSchema = successResponseSchema(
  "TeamWorkServerV2RouterBindingListResponse",
  z.object({
    items: z.array(z.object({ channel: z.string(), directory: z.string(), identityId: z.string(), peerId: z.string(), updatedAt: z.number().int().optional() })),
    ok: z.boolean(),
  }),
);
export const routerSendWriteSchema = z.object({ autoBind: z.boolean().optional(), channel: z.enum(["slack", "telegram"]), directory: z.string().optional(), identityId: z.string().optional(), peerId: z.string().optional(), text: z.string() }).meta({ ref: "TeamWorkServerV2RouterSendWrite" });
export const routerMutationResponseSchema = successResponseSchema(
  "TeamWorkServerV2RouterMutationResponse",
  z.record(z.string(), z.unknown()),
);

export const managedItemIdParamsSchema = z.object({ itemId: identifierSchema }).meta({ ref: "TeamWorkServerV2ManagedItemIdParams" });
export const workspaceNamedItemParamsSchema = workspaceIdParamsSchema.extend({ name: z.string() }).meta({ ref: "TeamWorkServerV2WorkspaceNamedItemParams" });
export const workspaceIdentityParamsSchema = workspaceIdParamsSchema.extend({ identityId: identifierSchema }).meta({ ref: "TeamWorkServerV2WorkspaceIdentityParams" });
