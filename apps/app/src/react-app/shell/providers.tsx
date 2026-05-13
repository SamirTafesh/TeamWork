/** @jsxImportSource react */
import { useEffect, type ReactNode } from "react";

import { isWebDeployment } from "../../app/lib/teamwork-deployment";
import { hydrateTeamworkServerSettingsFromEnv } from "../../app/lib/teamwork-server";
import { isDesktopRuntime } from "../../app/utils";
import { DenAuthProvider } from "../domains/cloud/den-auth-provider";
import { DesktopConfigProvider } from "../domains/cloud/desktop-config-provider";
import { RestrictionNoticeProvider } from "../domains/cloud/restriction-notice-provider";
import { StatusToastsProvider } from "../domains/shell-feedback/status-toasts";
import { LocalProvider } from "../kernel/local-provider";
import { ServerProvider } from "../kernel/server-provider";
import { BootStateProvider } from "./boot-state";
import { DesktopRuntimeBoot } from "./desktop-runtime-boot";
import { startDebugLogger, stopDebugLogger } from "./debug-logger";
import { resolveTeamworkConnection } from "./teamwork-connection";
import { ReloadCoordinatorProvider } from "./reload-coordinator";

function resolveDefaultServerUrl(): string {
  if (isDesktopRuntime()) return "http://127.0.0.1:4096";

  const teamworkUrl =
    typeof import.meta.env?.VITE_TEAMWORK_URL === "string"
      ? import.meta.env.VITE_TEAMWORK_URL.trim()
      : "";
  if (teamworkUrl) {
    return `${teamworkUrl.replace(/\/+$/, "")}/opencode`;
  }

  if (isWebDeployment() && import.meta.env.PROD && typeof window !== "undefined") {
    return `${window.location.origin}/opencode`;
  }

  const envUrl =
    typeof import.meta.env?.VITE_OPENCODE_URL === "string"
      ? import.meta.env.VITE_OPENCODE_URL.trim()
      : "";
  return envUrl || "http://127.0.0.1:4096";
}

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  hydrateTeamworkServerSettingsFromEnv();

  useEffect(() => {
    // Start the dev observability forwarder. Reads the current teamwork-server
    // URL on every flush so reconnects after port changes still work. In prod
    // builds `startDebugLogger` is a no-op.
    startDebugLogger({
      serverUrl: async () => (await resolveTeamworkConnection()).normalizedBaseUrl,
    });
    return () => {
      stopDebugLogger();
    };
  }, []);

  const defaultUrl = resolveDefaultServerUrl();
  return (
    <BootStateProvider>
      <ServerProvider defaultUrl={defaultUrl}>
        <DesktopRuntimeBoot />
        <DenAuthProvider>
          <DesktopConfigProvider>
            <RestrictionNoticeProvider>
              <LocalProvider>
                <StatusToastsProvider>
                  <ReloadCoordinatorProvider>{children}</ReloadCoordinatorProvider>
                </StatusToastsProvider>
              </LocalProvider>
            </RestrictionNoticeProvider>
          </DesktopConfigProvider>
        </DenAuthProvider>
      </ServerProvider>
    </BootStateProvider>
  );
}
