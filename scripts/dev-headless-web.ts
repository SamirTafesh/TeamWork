import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import path from "node:path";

const cwd = process.cwd();
const tmpDir = path.join(cwd, "tmp");

const ensureTmp = async () => {
  await mkdir(tmpDir, { recursive: true });
};

const isPortFree = (port: number, host: string) =>
  new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });

const getFreePort = (host: string) =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to resolve free port")));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });

const resolvePort = async (value: string | undefined, host: string) => {
  if (value) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      const free = await isPortFree(parsed, host);
      if (free) return parsed;
    }
  }
  return await getFreePort(host);
};

const logLine = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const readBool = (value: string | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
};

const silent = process.argv.includes("--silent");

const autoBuildEnabled =
  process.env.TEAMWORK_DEV_HEADLESS_WEB_AUTOBUILD == null
    ? true
    : readBool(process.env.TEAMWORK_DEV_HEADLESS_WEB_AUTOBUILD);

const runCommand = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: silent ? "ignore" : "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`,
        ),
      );
    });
  });

const spawnLogged = (
  command: string,
  args: string[],
  logPath: string,
  env: NodeJS.ProcessEnv,
) => {
  const logFd = openSync(logPath, "w");
  return spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", logFd, logFd],
  });
};

const shutdown = (
  label: string,
  code: number | null,
  signal: NodeJS.Signals | null,
) => {
  const reason =
    code !== null ? `code ${code}` : signal ? `signal ${signal}` : "unknown";
  logLine(`[dev:headless-web] ${label} exited (${reason})`);
  process.exit(code ?? 1);
};

await ensureTmp();

const remoteAccessEnabled = readBool(process.env.TEAMWORK_REMOTE_ACCESS);
const host = remoteAccessEnabled ? "0.0.0.0" : "127.0.0.1";
const viteHost = process.env.VITE_HOST ?? process.env.HOST ?? host;
const publicHost = process.env.TEAMWORK_PUBLIC_HOST ?? null;
const clientHost = publicHost ?? (host === "0.0.0.0" ? "127.0.0.1" : host);
const workspace = process.env.TEAMWORK_WORKSPACE ?? cwd;
const teamworkPort = await resolvePort(process.env.TEAMWORK_PORT, "127.0.0.1");
const webPort = await resolvePort(process.env.TEAMWORK_WEB_PORT, "127.0.0.1");
const teamworkToken = process.env.TEAMWORK_TOKEN ?? randomUUID();
const teamworkHostToken = process.env.TEAMWORK_HOST_TOKEN ?? randomUUID();
const teamworkServerBin = path.join(
  cwd,
  "apps/server/dist/bin/teamwork-server",
);
const opencodeRouterBin = path.join(
  cwd,
  "apps/opencode-router/dist/bin/opencode-router",
);

const ensureTeamworkServer = async () => {
  try {
    await access(teamworkServerBin);
  } catch {
    if (!autoBuildEnabled) {
      logLine(
        `[dev:headless-web] Missing TeamWork server binary at ${teamworkServerBin}`,
      );
      logLine(
        "[dev:headless-web] Auto-build disabled (TEAMWORK_DEV_HEADLESS_WEB_AUTOBUILD=0)",
      );
      logLine(
        "[dev:headless-web] Run: pnpm --filter teamwork-server build:bin",
      );
      logLine(
        "[dev:headless-web] Or unset/enable TEAMWORK_DEV_HEADLESS_WEB_AUTOBUILD to auto-build.",
      );
      process.exit(1);
    }

    logLine(
      `[dev:headless-web] Missing TeamWork server binary at ${teamworkServerBin}`,
    );
    logLine(
      "[dev:headless-web] Auto-building: pnpm --filter teamwork-server build:bin",
    );
    try {
      await runCommand("pnpm", ["--filter", "teamwork-server", "build:bin"]);
      await access(teamworkServerBin);
    } catch (error) {
      logLine(
        `[dev:headless-web] Auto-build failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  }
};

const ensureOpencodeRouter = async () => {
  try {
    await access(opencodeRouterBin);
  } catch {
    if (!autoBuildEnabled) {
      logLine(
        `[dev:headless-web] Missing opencode-router binary at ${opencodeRouterBin}`,
      );
      logLine(
        "[dev:headless-web] Auto-build disabled (TEAMWORK_DEV_HEADLESS_WEB_AUTOBUILD=0)",
      );
      logLine(
        "[dev:headless-web] Run: pnpm --filter opencode-router build:bin",
      );
      logLine(
        "[dev:headless-web] Or unset/enable TEAMWORK_DEV_HEADLESS_WEB_AUTOBUILD to auto-build.",
      );
      process.exit(1);
    }

    logLine(
      `[dev:headless-web] Missing opencode-router binary at ${opencodeRouterBin}`,
    );
    logLine(
      "[dev:headless-web] Auto-building: pnpm --filter opencode-router build:bin",
    );
    try {
      await runCommand("pnpm", ["--filter", "opencode-router", "build:bin"]);
      await access(opencodeRouterBin);
    } catch (error) {
      logLine(
        `[dev:headless-web] Auto-build failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  }
};

const teamworkUrl = `http://${clientHost}:${teamworkPort}`;
const webUrl = `http://${clientHost}:${webPort}`;
// In practice we want opencode-router on for end-to-end messaging tests.
// Allow opt-out via TEAMWORK_DEV_OPENCODE_ROUTER=0.
const opencodeRouterEnabled =
  process.env.TEAMWORK_DEV_OPENCODE_ROUTER == null
    ? true
    : readBool(process.env.TEAMWORK_DEV_OPENCODE_ROUTER);
const opencodeRouterRequired = readBool(
  process.env.TEAMWORK_DEV_OPENCODE_ROUTER_REQUIRED,
);
const viteEnv = {
  ...process.env,
  HOST: viteHost,
  PORT: String(webPort),
  VITE_TEAMWORK_URL: process.env.VITE_TEAMWORK_URL ?? teamworkUrl,
  VITE_TEAMWORK_PORT: process.env.VITE_TEAMWORK_PORT ?? String(teamworkPort),
  VITE_TEAMWORK_TOKEN: process.env.VITE_TEAMWORK_TOKEN ?? teamworkToken,
};
const headlessEnv = {
  ...process.env,
  TEAMWORK_WORKSPACE: workspace,
  TEAMWORK_HOST: host,
  TEAMWORK_REMOTE_ACCESS: remoteAccessEnabled ? "1" : "0",
  TEAMWORK_PORT: String(teamworkPort),
  TEAMWORK_TOKEN: teamworkToken,
  TEAMWORK_HOST_TOKEN: teamworkHostToken,
  TEAMWORK_SERVER_BIN: teamworkServerBin,
  TEAMWORK_SIDECAR_SOURCE: process.env.TEAMWORK_SIDECAR_SOURCE ?? "external",
  OPENCODE_ROUTER_BIN: process.env.OPENCODE_ROUTER_BIN ?? opencodeRouterBin,
};

await ensureTeamworkServer();
if (opencodeRouterEnabled) {
  await ensureOpencodeRouter();
}

logLine("[dev:headless-web] Starting services");
logLine(`[dev:headless-web] Workspace: ${workspace}`);
logLine(`[dev:headless-web] TeamWork server: ${teamworkUrl}`);
logLine(`[dev:headless-web] Web host: ${viteHost}`);
logLine(`[dev:headless-web] Web port: ${webPort}`);
logLine(`[dev:headless-web] Web URL: ${webUrl}`);
logLine(
  `[dev:headless-web] OpenCodeRouter: ${opencodeRouterEnabled ? "on" : "off"} (set TEAMWORK_DEV_OPENCODE_ROUTER=0 to disable)`,
);
logLine("[dev:headless-web] TEAMWORK_TOKEN: [REDACTED]");
logLine("[dev:headless-web] TEAMWORK_HOST_TOKEN: [REDACTED]");
logLine(
  `[dev:headless-web] Web logs: ${path.relative(cwd, path.join(tmpDir, "dev-web.log"))}`,
);
logLine(
  `[dev:headless-web] Headless logs: ${path.relative(cwd, path.join(tmpDir, "dev-headless.log"))}`,
);

const webProcess = spawnLogged(
  "pnpm",
  [
    "--filter",
    "@teamwork/app",
    "exec",
    "vite",
    "--host",
    viteHost,
    "--port",
    String(webPort),
    "--strictPort",
  ],
  path.join(tmpDir, "dev-web.log"),
  viteEnv,
);

const headlessProcess = spawnLogged(
  "pnpm",
  [
    "--filter",
    "teamwork-orchestrator",
    "dev",
    "--",
    "start",
    "--workspace",
    workspace,
    "--approval",
    "auto",
    "--allow-external",
    "--opencode-router",
    opencodeRouterEnabled ? "true" : "false",
    ...(opencodeRouterRequired ? ["--opencode-router-required"] : []),
    ...(remoteAccessEnabled ? ["--remote-access"] : []),
    "--teamwork-port",
    String(teamworkPort),
  ],
  path.join(tmpDir, "dev-headless.log"),
  headlessEnv,
);

const stopAll = (signal: NodeJS.Signals) => {
  webProcess.kill(signal);
  headlessProcess.kill(signal);
};

process.on("SIGINT", () => {
  stopAll("SIGINT");
});
process.on("SIGTERM", () => {
  stopAll("SIGTERM");
});

webProcess.on("exit", (code, signal) => shutdown("web", code, signal));
headlessProcess.on("exit", (code, signal) =>
  shutdown("orchestrator", code, signal),
);
