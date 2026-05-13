import { z } from "zod";
import { identifierSchema, isoTimestampSchema, successResponseSchema } from "./common.js";
import { runtimeSummaryDataSchema } from "./runtime.js";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const routeNamespacesSchema = z.object({
  root: z.literal("/"),
  openapi: z.literal("/openapi.json"),
  system: z.literal("/system"),
  workspaces: z.literal("/workspaces"),
  workspaceResource: z.string().startsWith("/workspaces/"),
}).meta({ ref: "TeamWorkServerV2RouteNamespaces" });

export const contractMetadataSchema = z.object({
  source: z.literal("hono-openapi"),
  openapiPath: z.literal("/openapi.json"),
  sdkPackage: z.literal("@teamwork/server-sdk"),
}).meta({ ref: "TeamWorkServerV2ContractMetadata" });

export const databaseStatusSchema = z.object({
  bootstrapMode: z.enum(["fresh", "existing"]),
  configured: z.literal(true),
  importWarnings: z.number().int().nonnegative(),
  kind: z.literal("sqlite"),
  migrations: z.object({
    appliedThisRun: z.array(z.string()),
    currentVersion: z.string(),
    totalApplied: z.number().int().nonnegative(),
  }).meta({ ref: "TeamWorkServerV2MigrationStatus" }),
  path: z.string(),
  phaseOwner: z.literal(2),
  status: z.enum(["ready", "warning"]),
  summary: z.string(),
  workingDirectory: z.string(),
}).meta({ ref: "TeamWorkServerV2DatabaseStatus" });

export const importSourceReportSchema = z.object({
  details: jsonObjectSchema,
  sourcePath: z.string().nullable(),
  status: z.enum(["error", "imported", "skipped", "unavailable"]),
  warnings: z.array(z.string()),
}).meta({ ref: "TeamWorkServerV2ImportSourceReport" });

export const startupDiagnosticsSchema = z.object({
  completedAt: isoTimestampSchema,
  importReports: z.object({
    cloudSignin: importSourceReportSchema,
    desktopWorkspaceState: importSourceReportSchema,
    orchestratorAuth: importSourceReportSchema,
    orchestratorState: importSourceReportSchema,
  }).meta({ ref: "TeamWorkServerV2ImportReports" }),
  legacyWorkspaceImport: z.object({
    completedAt: isoTimestampSchema.nullable(),
    skipped: z.boolean(),
  }).meta({ ref: "TeamWorkServerV2LegacyWorkspaceImportState" }),
  mode: z.enum(["fresh", "existing"]),
  migrations: z.object({
    applied: z.array(z.string()),
    currentVersion: z.string(),
    totalApplied: z.number().int().nonnegative(),
  }).meta({ ref: "TeamWorkServerV2StartupMigrationSummary" }),
  registry: z.object({
    hiddenWorkspaceIds: z.array(identifierSchema),
    localServerCreated: z.boolean(),
    localServerId: identifierSchema,
    totalServers: z.number().int().nonnegative(),
    totalVisibleWorkspaces: z.number().int().nonnegative(),
  }).meta({ ref: "TeamWorkServerV2StartupRegistrySummary" }),
  warnings: z.array(z.string()),
  workingDirectory: z.object({
    databasePath: z.string(),
    rootDir: z.string(),
    workspacesDir: z.string(),
  }).meta({ ref: "TeamWorkServerV2WorkingDirectory" }),
}).meta({ ref: "TeamWorkServerV2StartupDiagnostics" });

export const rootInfoDataSchema = z.object({
  service: z.literal("teamwork-server-v2"),
  packageName: z.literal("teamwork-server-v2"),
  version: z.string(),
  environment: z.string(),
  routes: routeNamespacesSchema,
  contract: contractMetadataSchema,
}).meta({ ref: "TeamWorkServerV2RootInfoData" });

export const healthDataSchema = z.object({
  service: z.literal("teamwork-server-v2"),
  status: z.literal("ok"),
  startedAt: isoTimestampSchema,
  uptimeMs: z.number().int().nonnegative(),
  database: databaseStatusSchema,
}).meta({ ref: "TeamWorkServerV2HealthData" });

export const runtimeInfoSchema = z.object({
  environment: z.string(),
  hostname: z.string(),
  pid: z.number().int().nonnegative(),
  platform: z.string(),
  runtime: z.literal("bun"),
  runtimeVersion: z.string().nullable(),
}).meta({ ref: "TeamWorkServerV2RuntimeInfo" });

export const metadataDataSchema = z.object({
  foundation: z.object({
    phase: z.literal(8),
    middlewareOrder: z.array(identifierSchema).min(1),
    routeNamespaces: routeNamespacesSchema,
    database: databaseStatusSchema,
    startup: startupDiagnosticsSchema,
  }).meta({ ref: "TeamWorkServerV2FoundationInfo" }),
  requestContext: z.object({
    actorKind: z.enum(["anonymous", "client", "host"]),
    requestIdHeader: z.literal("X-Request-Id"),
  }).meta({ ref: "TeamWorkServerV2RequestContextInfo" }),
  runtime: runtimeInfoSchema,
  runtimeSupervisor: runtimeSummaryDataSchema,
  contract: contractMetadataSchema,
}).meta({ ref: "TeamWorkServerV2MetadataData" });

export const rootInfoResponseSchema = successResponseSchema("TeamWorkServerV2RootInfoResponse", rootInfoDataSchema);
export const healthResponseSchema = successResponseSchema("TeamWorkServerV2HealthResponse", healthDataSchema);
export const metadataResponseSchema = successResponseSchema("TeamWorkServerV2MetadataResponse", metadataDataSchema);

export const openApiDocumentSchema = z.object({
  openapi: z.string(),
  info: z.object({
    title: z.string(),
    version: z.string(),
  }).passthrough(),
  paths: z.record(z.string(), z.unknown()),
  components: z.object({}).passthrough().optional(),
}).passthrough().meta({ ref: "TeamWorkServerV2OpenApiDocument" });
