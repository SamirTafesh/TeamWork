import { useSyncExternalStore } from "react";

import { t } from "../../../i18n";
import type { StartupPreference, WorkspaceDisplay } from "../../../app/types";
import { isDesktopRuntime } from "../../../app/utils";
import {
  teamworkServerInfo,
  teamworkServerRestart,
  type TeamworkServerInfo,
} from "../../../app/lib/desktop";
import {
  clearTeamworkServerSettings,
  createTeamworkServerClient,
  isLoopbackTeamworkServerUrl,
  normalizeTeamworkServerUrl,
  readTeamworkServerSettings,
  writeTeamworkServerSettings,
  type TeamworkAuditEntry,
  type TeamworkServerCapabilities,
  type TeamworkServerClient,
  type TeamworkServerDiagnostics,
  type TeamworkServerError,
  type TeamworkServerSettings,
  type TeamworkServerStatus,
} from "../../../app/lib/teamwork-server";

type SetStateAction<T> = T | ((current: T) => T);

type RemoteWorkspaceInput = {
  teamworkHostUrl: string;
  teamworkToken?: string | null;
  directory?: string | null;
  displayName?: string | null;
};

export type TeamworkServerStoreSnapshot = {
  teamworkServerSettings: TeamworkServerSettings;
  shareRemoteAccessBusy: boolean;
  shareRemoteAccessError: string | null;
  teamworkServerUrl: string;
  teamworkServerBaseUrl: string;
  teamworkServerAuth: { token?: string; hostToken?: string };
  teamworkServerClient: TeamworkServerClient | null;
  teamworkServerStatus: TeamworkServerStatus;
  teamworkServerCapabilities: TeamworkServerCapabilities | null;
  teamworkServerReady: boolean;
  teamworkServerWorkspaceReady: boolean;
  resolvedTeamworkCapabilities: TeamworkServerCapabilities | null;
  teamworkServerCanWriteSkills: boolean;
  teamworkServerCanWritePlugins: boolean;
  teamworkServerHostInfo: TeamworkServerInfo | null;
  teamworkServerDiagnostics: TeamworkServerDiagnostics | null;
  teamworkReconnectBusy: boolean;
  teamworkAuditEntries: TeamworkAuditEntry[];
  teamworkAuditStatus: "idle" | "loading" | "error";
  teamworkAuditError: string | null;
  devtoolsWorkspaceId: string | null;
};

export type TeamworkServerStore = ReturnType<typeof createTeamworkServerStore>;

type CreateTeamworkServerStoreOptions = {
  startupPreference: () => StartupPreference | null;
  documentVisible: () => boolean;
  developerMode: () => boolean;
  runtimeWorkspaceId: () => string | null;
  activeClient: () => unknown | null;
  selectedWorkspaceDisplay: () => WorkspaceDisplay;
  restartLocalServer: () => Promise<boolean>;
  createRemoteWorkspaceFlow: (input: RemoteWorkspaceInput) => Promise<boolean>;
};

type MutableState = {
  teamworkServerSettings: TeamworkServerSettings;
  shareRemoteAccessBusy: boolean;
  shareRemoteAccessError: string | null;
  teamworkServerUrl: string;
  teamworkServerStatus: TeamworkServerStatus;
  teamworkServerCapabilities: TeamworkServerCapabilities | null;
  teamworkServerCheckedAt: number | null;
  teamworkServerHostInfo: TeamworkServerInfo | null;
  teamworkServerHostInfoReady: boolean;
  teamworkServerDiagnostics: TeamworkServerDiagnostics | null;
  teamworkReconnectBusy: boolean;
  teamworkAuditEntries: TeamworkAuditEntry[];
  teamworkAuditStatus: "idle" | "loading" | "error";
  teamworkAuditError: string | null;
  devtoolsWorkspaceId: string | null;
};

const applyStateAction = <T,>(current: T, next: SetStateAction<T>) =>
  typeof next === "function" ? (next as (value: T) => T)(current) : next;

export function createTeamworkServerStore(options: CreateTeamworkServerStoreOptions) {
  const bootStartedAt = Date.now();
  const listeners = new Set<() => void>();
  const intervals = new Map<string, number>();

  let clientCacheKey = "";
  let clientCacheValue: TeamworkServerClient | null = null;
  let started = false;
  let disposed = false;
  let healthTimeoutId: number | null = null;
  let healthBusy = false;
  let healthDelayMs = 10_000;
  let snapshot: TeamworkServerStoreSnapshot;

  let state: MutableState = {
    teamworkServerSettings: readTeamworkServerSettings(),
    shareRemoteAccessBusy: false,
    shareRemoteAccessError: null,
    teamworkServerUrl: "",
    teamworkServerStatus: "disconnected",
    teamworkServerCapabilities: null,
    teamworkServerCheckedAt: null,
    teamworkServerHostInfo: null,
    teamworkServerHostInfoReady: !isDesktopRuntime(),
    teamworkServerDiagnostics: null,
    teamworkReconnectBusy: false,
    teamworkAuditEntries: [],
    teamworkAuditStatus: "idle",
    teamworkAuditError: null,
    devtoolsWorkspaceId: null,
  };

  const emitChange = () => {
    for (const listener of listeners) listener();
  };

  const getBaseUrl = () => {
    const pref = options.startupPreference();
    const hostInfo = state.teamworkServerHostInfo;
    const settingsUrl = normalizeTeamworkServerUrl(state.teamworkServerSettings.urlOverride ?? "") ?? "";

    if (pref === "local") return hostInfo?.baseUrl ?? "";
    if (pref === "server" && settingsUrl && isLoopbackTeamworkServerUrl(settingsUrl) && hostInfo?.baseUrl) {
      return hostInfo.baseUrl;
    }
    if (pref === "server") return settingsUrl;
    return hostInfo?.baseUrl ?? settingsUrl;
  };

  const getAuth = () => {
    const pref = options.startupPreference();
    const hostInfo = state.teamworkServerHostInfo;
    const settingsUrl = normalizeTeamworkServerUrl(state.teamworkServerSettings.urlOverride ?? "") ?? "";
    const settingsToken = state.teamworkServerSettings.token?.trim() ?? "";
    const settingsHostToken = state.teamworkServerSettings.hostToken?.trim() ?? "";
    const clientToken = hostInfo?.clientToken?.trim() ?? "";
    const hostToken = hostInfo?.hostToken?.trim() ?? "";

    if (pref === "local") {
      return { token: clientToken || undefined, hostToken: hostToken || undefined };
    }
    if (pref === "server" && settingsUrl && isLoopbackTeamworkServerUrl(settingsUrl) && hostInfo?.baseUrl) {
      return {
        token: clientToken || settingsToken || undefined,
        hostToken: hostToken || settingsHostToken || undefined,
      };
    }
    if (pref === "server") {
      return {
        token: settingsToken || undefined,
        hostToken: settingsUrl && isLoopbackTeamworkServerUrl(settingsUrl) ? settingsHostToken || undefined : undefined,
      };
    }
    if (hostInfo?.baseUrl) {
      return { token: clientToken || undefined, hostToken: hostToken || undefined };
    }
    return {
      token: settingsToken || undefined,
      hostToken: settingsUrl && isLoopbackTeamworkServerUrl(settingsUrl) ? settingsHostToken || undefined : undefined,
    };
  };

  const getClient = () => {
    const baseUrl = getBaseUrl().trim();
    if (!baseUrl) {
      clientCacheKey = "";
      clientCacheValue = null;
      return null;
    }

    const auth = getAuth();
    const key = `${baseUrl}::${auth.token ?? ""}::${auth.hostToken ?? ""}`;
    if (key !== clientCacheKey) {
      clientCacheKey = key;
      clientCacheValue = createTeamworkServerClient({
        baseUrl,
        token: auth.token,
        hostToken: auth.hostToken,
      });
    }
    return clientCacheValue;
  };

  const refreshSnapshot = () => {
    const teamworkServerBaseUrl = getBaseUrl().trim();
    const teamworkServerAuth = getAuth();
    const teamworkServerClient = getClient();
    const teamworkServerReady = state.teamworkServerStatus === "connected";
    const teamworkServerWorkspaceReady = Boolean(options.runtimeWorkspaceId());
    const resolvedTeamworkCapabilities = state.teamworkServerCapabilities;

    const pref = options.startupPreference();
    const info = state.teamworkServerHostInfo;
    const hostUrl = info?.connectUrl ?? info?.lanUrl ?? info?.mdnsUrl ?? info?.baseUrl ?? "";
    const settingsUrl = normalizeTeamworkServerUrl(state.teamworkServerSettings.urlOverride ?? "") ?? "";

    let teamworkServerUrl = hostUrl || settingsUrl;
    if (pref === "local") teamworkServerUrl = hostUrl;
    if (pref === "server") teamworkServerUrl = settingsUrl;
    state.teamworkServerUrl = teamworkServerUrl;

    snapshot = {
      teamworkServerSettings: state.teamworkServerSettings,
      shareRemoteAccessBusy: state.shareRemoteAccessBusy,
      shareRemoteAccessError: state.shareRemoteAccessError,
      teamworkServerUrl,
      teamworkServerBaseUrl,
      teamworkServerAuth,
      teamworkServerClient,
      teamworkServerStatus: state.teamworkServerStatus,
      teamworkServerCapabilities: state.teamworkServerCapabilities,
      teamworkServerReady,
      teamworkServerWorkspaceReady,
      resolvedTeamworkCapabilities,
      teamworkServerCanWriteSkills:
        teamworkServerReady &&
        (resolvedTeamworkCapabilities?.skills?.write ?? false),
      teamworkServerCanWritePlugins:
        teamworkServerReady &&
        (resolvedTeamworkCapabilities?.plugins?.write ?? false),
      teamworkServerHostInfo: state.teamworkServerHostInfo,
      teamworkServerDiagnostics: state.teamworkServerDiagnostics,
      teamworkReconnectBusy: state.teamworkReconnectBusy,
      teamworkAuditEntries: state.teamworkAuditEntries,
      teamworkAuditStatus: state.teamworkAuditStatus,
      teamworkAuditError: state.teamworkAuditError,
      devtoolsWorkspaceId: state.devtoolsWorkspaceId,
    };
  };

  const mutateState = (updater: (current: MutableState) => MutableState) => {
    state = updater(state);
    refreshSnapshot();
    emitChange();
  };

  const setStateField = <K extends keyof MutableState>(key: K, value: MutableState[K]) => {
    if (Object.is(state[key], value)) return;
    mutateState((current) => ({ ...current, [key]: value }));
  };

  const setTeamworkServerSettings = (next: SetStateAction<TeamworkServerSettings>) => {
    const resolved = applyStateAction(state.teamworkServerSettings, next);
    mutateState((current) => ({ ...current, teamworkServerSettings: resolved }));
    queueHealthCheck(0);
  };

  const updateTeamworkServerSettings = (next: TeamworkServerSettings) => {
    const stored = writeTeamworkServerSettings(next);
    mutateState((current) => ({ ...current, teamworkServerSettings: stored }));
    queueHealthCheck(0);
  };

  const resetTeamworkServerSettings = () => {
    clearTeamworkServerSettings();
    mutateState((current) => ({ ...current, teamworkServerSettings: {} }));
    queueHealthCheck(0);
  };

  const shouldWaitForLocalHostInfo = () =>
    isDesktopRuntime() &&
    options.startupPreference() !== "server" &&
    !state.teamworkServerHostInfoReady;

  const shouldRetryStartupCheck = (status: TeamworkServerStatus) =>
    status !== "connected" &&
    isDesktopRuntime() &&
    options.startupPreference() !== "server" &&
    Date.now() - bootStartedAt < 5_000;

  const checkTeamworkServer = async (url: string, token?: string, hostToken?: string) => {
    const client = createTeamworkServerClient({ baseUrl: url, token, hostToken });
    try {
      await client.health();
    } catch (error) {
      const resolved = error as TeamworkServerError | Error;
      if ("status" in resolved && (resolved.status === 401 || resolved.status === 403)) {
        return { status: "limited" as TeamworkServerStatus, capabilities: null };
      }
      return { status: "disconnected" as TeamworkServerStatus, capabilities: null };
    }

    if (!token) {
      return { status: "limited" as TeamworkServerStatus, capabilities: null };
    }

    try {
      const capabilities = await client.capabilities();
      return { status: "connected" as TeamworkServerStatus, capabilities };
    } catch (error) {
      const resolved = error as TeamworkServerError | Error;
      if ("status" in resolved && (resolved.status === 401 || resolved.status === 403)) {
        return { status: "limited" as TeamworkServerStatus, capabilities: null };
      }
      return { status: "disconnected" as TeamworkServerStatus, capabilities: null };
    }
  };

  const clearHealthTimeout = () => {
    if (healthTimeoutId !== null) {
      window.clearTimeout(healthTimeoutId);
      healthTimeoutId = null;
    }
  };

  const queueHealthCheck = (delayMs: number) => {
    if (disposed || typeof window === "undefined") return;
    clearHealthTimeout();
    healthTimeoutId = window.setTimeout(() => {
      healthTimeoutId = null;
      void runHealthCheck();
    }, Math.max(0, delayMs));
  };

  const runHealthCheck = async () => {
    if (disposed || typeof window === "undefined") return;
    if (!options.documentVisible()) return;
    if (shouldWaitForLocalHostInfo()) return;
    if (healthBusy) return;

    const url = getBaseUrl().trim();
    const auth = getAuth();
    if (!url) {
      mutateState((current) => ({
        ...current,
        teamworkServerStatus: "disconnected",
        teamworkServerCapabilities: null,
        teamworkServerCheckedAt: Date.now(),
      }));
      return;
    }

    healthBusy = true;
    try {
      let result = await checkTeamworkServer(url, auth.token, auth.hostToken);

      if (shouldRetryStartupCheck(result.status)) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
        if (disposed) return;

        try {
          const info = await teamworkServerInfo();
          if (disposed) return;

          mutateState((current) => ({
            ...current,
            teamworkServerHostInfo: info,
            teamworkServerHostInfoReady: true,
          }));

          const retryUrl = info.baseUrl?.trim() ?? "";
          const retryToken = info.clientToken?.trim() || undefined;
          const retryHostToken = info.hostToken?.trim() || undefined;
          if (retryUrl) {
            result = await checkTeamworkServer(retryUrl, retryToken, retryHostToken);
          }
        } catch {
          // Preserve the original check result when the retry probe fails.
        }
      }

      if (disposed) return;
      healthDelayMs =
        result.status === "connected" || result.status === "limited"
          ? 10_000
          : Math.min(healthDelayMs * 2, 60_000);

      mutateState((current) => ({
        ...current,
        teamworkServerStatus: result.status,
        teamworkServerCapabilities: result.capabilities,
        teamworkServerCheckedAt: Date.now(),
      }));
    } catch {
      healthDelayMs = Math.min(healthDelayMs * 2, 60_000);
      mutateState((current) => ({
        ...current,
        teamworkServerCheckedAt: Date.now(),
      }));
    } finally {
      healthBusy = false;
      if (!disposed) queueHealthCheck(healthDelayMs);
    }
  };

  const syncFromOptions = () => {
    refreshSnapshot();
    emitChange();

    if (!isDesktopRuntime()) return;
    const port = state.teamworkServerHostInfo?.port;
    if (!port) return;
    if (state.teamworkServerSettings.portOverride === port) return;

    updateTeamworkServerSettings({
      ...state.teamworkServerSettings,
      portOverride: port,
    });
  };

  const startInterval = (key: string, fn: () => void, ms: number) => {
    if (typeof window === "undefined") return;
    if (intervals.has(key)) return;
    intervals.set(key, window.setInterval(fn, ms));
  };

  const stopInterval = (key: string) => {
    const id = intervals.get(key);
    if (id === undefined) return;
    window.clearInterval(id);
    intervals.delete(key);
  };

  const start = () => {
    if (typeof window === "undefined") return;
    if (started) return;
    // Allow restart after a prior dispose() (React 18 StrictMode double-mounts
    // each effect in dev: mount → dispose → re-mount). If we early-return when
    // `disposed` is true, the real mount never arms polling and the UI stays
    // on stale/empty state forever.
    disposed = false;
    started = true;

    syncFromOptions();
    queueHealthCheck(0);

    const refreshHostInfo = () => {
      if (!isDesktopRuntime()) return;
      if (!options.documentVisible()) return;
      void (async () => {
        try {
          const info = await teamworkServerInfo();
          if (disposed) return;
          mutateState((current) => ({
            ...current,
            teamworkServerHostInfo: info,
            teamworkServerHostInfoReady: true,
          }));
        } catch {
          if (disposed) return;
          mutateState((current) => ({
            ...current,
            teamworkServerHostInfo: null,
            teamworkServerHostInfoReady: true,
          }));
        }
      })();
    };
    refreshHostInfo();
    startInterval("hostInfo", refreshHostInfo, 10_000);

    const refreshDiagnostics = () => {
      if (!options.documentVisible()) return;
      if (!options.developerMode()) {
        setStateField("teamworkServerDiagnostics", null);
        return;
      }

      const client = getClient();
      if (!client || state.teamworkServerStatus === "disconnected") {
        setStateField("teamworkServerDiagnostics", null);
        return;
      }

      void (async () => {
        try {
          const status = await client.status();
          if (!disposed) setStateField("teamworkServerDiagnostics", status);
        } catch {
          if (!disposed) setStateField("teamworkServerDiagnostics", null);
        }
      })();
    };
    refreshDiagnostics();
    startInterval("diagnostics", refreshDiagnostics, 10_000);

    const refreshDevtoolsWorkspace = () => {
      if (!options.documentVisible()) return;
      if (!options.developerMode()) {
        setStateField("devtoolsWorkspaceId", null);
        return;
      }

      const client = getClient();
      if (!client) {
        setStateField("devtoolsWorkspaceId", null);
        return;
      }

      void (async () => {
        try {
          const response = await client.listWorkspaces();
          if (disposed) return;
          const items = Array.isArray(response.items) ? response.items : [];
          const activeMatch = response.activeId
            ? items.find((item) => item.id === response.activeId)
            : null;
          setStateField("devtoolsWorkspaceId", activeMatch?.id ?? items[0]?.id ?? null);
        } catch {
          if (!disposed) setStateField("devtoolsWorkspaceId", null);
        }
      })();
    };
    refreshDevtoolsWorkspace();
    startInterval("devtoolsWorkspace", refreshDevtoolsWorkspace, 20_000);

    const refreshAudit = () => {
      if (!options.documentVisible()) return;
      if (!options.developerMode()) {
        mutateState((current) => ({
          ...current,
          teamworkAuditEntries: [],
          teamworkAuditStatus: "idle",
          teamworkAuditError: null,
        }));
        return;
      }

      const client = getClient();
      const workspaceId = state.devtoolsWorkspaceId;
      if (!client || !workspaceId) {
        mutateState((current) => ({
          ...current,
          teamworkAuditEntries: [],
          teamworkAuditStatus: "idle",
          teamworkAuditError: null,
        }));
        return;
      }

      mutateState((current) => ({
        ...current,
        teamworkAuditStatus: "loading",
        teamworkAuditError: null,
      }));

      void (async () => {
        try {
          const result = await client.listAudit(workspaceId, 50);
          if (disposed) return;
          mutateState((current) => ({
            ...current,
            teamworkAuditEntries: Array.isArray(result.items) ? result.items : [],
            teamworkAuditStatus: "idle",
          }));
        } catch (error) {
          if (disposed) return;
          mutateState((current) => ({
            ...current,
            teamworkAuditEntries: [],
            teamworkAuditStatus: "error",
            teamworkAuditError:
              error instanceof Error
                ? error.message
                : t("app.error_audit_load"),
          }));
        }
      })();
    };
    refreshAudit();
    startInterval("audit", refreshAudit, 15_000);
  };

  const dispose = () => {
    disposed = true;
    started = false;
    clearHealthTimeout();
    for (const key of [...intervals.keys()]) stopInterval(key);
  };

  const testTeamworkServerConnection = async (next: TeamworkServerSettings) => {
    const derived = normalizeTeamworkServerUrl(next.urlOverride ?? "");
    if (!derived) {
      mutateState((current) => ({
        ...current,
        teamworkServerStatus: "disconnected",
        teamworkServerCapabilities: null,
        teamworkServerCheckedAt: Date.now(),
      }));
      return false;
    }

    const result = await checkTeamworkServer(derived, next.token);
    mutateState((current) => ({
      ...current,
      teamworkServerStatus: result.status,
      teamworkServerCapabilities: result.capabilities,
      teamworkServerCheckedAt: Date.now(),
    }));

    const ok = result.status === "connected" || result.status === "limited";
    if (ok && !isDesktopRuntime()) {
      const active = options.selectedWorkspaceDisplay();
      const shouldAttach =
        !options.activeClient() ||
        active.workspaceType !== "remote" ||
        active.remoteType !== "teamwork";
      if (shouldAttach) {
        await options
          .createRemoteWorkspaceFlow({
            teamworkHostUrl: derived,
            teamworkToken: next.token ?? null,
          })
          .catch(() => undefined);
      }
    }
    return ok;
  };

  const reconnectTeamworkServer = async () => {
    if (state.teamworkReconnectBusy) return false;
    setStateField("teamworkReconnectBusy", true);

    try {
      let hostInfo = state.teamworkServerHostInfo;
      if (isDesktopRuntime()) {
        try {
          hostInfo = await teamworkServerInfo();
          mutateState((current) => ({ ...current, teamworkServerHostInfo: hostInfo }));
        } catch {
          hostInfo = null;
          setStateField("teamworkServerHostInfo", null);
        }
      }

      if (hostInfo?.clientToken?.trim() && options.startupPreference() !== "server") {
        const liveToken = hostInfo.clientToken.trim();
        const settings = state.teamworkServerSettings;
        if ((settings.token?.trim() ?? "") !== liveToken) {
          updateTeamworkServerSettings({ ...settings, token: liveToken });
        }
      }

      const url = getBaseUrl().trim();
      const auth = getAuth();
      if (!url) {
        mutateState((current) => ({
          ...current,
          teamworkServerStatus: "disconnected",
          teamworkServerCapabilities: null,
          teamworkServerCheckedAt: Date.now(),
        }));
        return false;
      }

      const result = await checkTeamworkServer(url, auth.token, auth.hostToken);
      mutateState((current) => ({
        ...current,
        teamworkServerStatus: result.status,
        teamworkServerCapabilities: result.capabilities,
        teamworkServerCheckedAt: Date.now(),
      }));
      return result.status === "connected" || result.status === "limited";
    } finally {
      setStateField("teamworkReconnectBusy", false);
    }
  };

  async function ensureLocalTeamworkServerClient(): Promise<TeamworkServerClient | null> {
    let hostInfo = state.teamworkServerHostInfo;
    if (hostInfo?.baseUrl?.trim() && hostInfo.clientToken?.trim()) {
      const existing = createTeamworkServerClient({
        baseUrl: hostInfo.baseUrl.trim(),
        token: hostInfo.clientToken.trim(),
        hostToken: hostInfo.hostToken?.trim() || undefined,
      });
      try {
        await existing.health();
        if (options.startupPreference() !== "server") {
          await reconnectTeamworkServer();
        }
        return existing;
      } catch {
        // Fall through to a local restart.
      }
    }

    if (!isDesktopRuntime()) return null;

    try {
      hostInfo = await teamworkServerRestart({
        remoteAccessEnabled: state.teamworkServerSettings.remoteAccessEnabled === true,
      });
      mutateState((current) => ({ ...current, teamworkServerHostInfo: hostInfo }));
    } catch {
      return null;
    }

    const baseUrl = hostInfo?.baseUrl?.trim() ?? "";
    const token = hostInfo?.clientToken?.trim() ?? "";
    const hostToken = hostInfo?.hostToken?.trim() ?? "";
    if (!baseUrl || !token) return null;

    if (options.startupPreference() !== "server") {
      await reconnectTeamworkServer();
    }

    return createTeamworkServerClient({
      baseUrl,
      token,
      hostToken: hostToken || undefined,
    });
  }

  const saveShareRemoteAccess = async (enabled: boolean) => {
    if (state.shareRemoteAccessBusy) return;
    const previous = state.teamworkServerSettings;
    const next: TeamworkServerSettings = {
      ...previous,
      remoteAccessEnabled: enabled,
    };

    mutateState((current) => ({
      ...current,
      shareRemoteAccessBusy: true,
      shareRemoteAccessError: null,
    }));
    updateTeamworkServerSettings(next);

    try {
      if (isDesktopRuntime() && options.selectedWorkspaceDisplay().workspaceType === "local") {
        const restarted = await options.restartLocalServer();
        if (!restarted) {
          throw new Error(t("app.error_restart_local_worker"));
        }
        await reconnectTeamworkServer();
      }
    } catch (error) {
      updateTeamworkServerSettings(previous);
      mutateState((current) => ({
        ...current,
        shareRemoteAccessError:
          error instanceof Error
            ? error.message
            : t("app.error_remote_access"),
      }));
      return;
    } finally {
      setStateField("shareRemoteAccessBusy", false);
    }
  };

  refreshSnapshot();

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => snapshot;

  return {
    subscribe,
    getSnapshot,
    start,
    dispose,
    syncFromOptions,
    setTeamworkServerSettings,
    updateTeamworkServerSettings,
    resetTeamworkServerSettings,
    saveShareRemoteAccess,
    checkTeamworkServer,
    testTeamworkServerConnection,
    reconnectTeamworkServer,
    ensureLocalTeamworkServerClient,
  };
}

export function useTeamworkServerStoreSnapshot(store: TeamworkServerStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
