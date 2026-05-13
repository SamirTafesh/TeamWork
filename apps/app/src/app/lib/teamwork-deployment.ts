export const TEAMWORK_DEPLOYMENT_ENV_VAR = "VITE_TEAMWORK_DEPLOYMENT";

export type TeamWorkDeployment = "desktop" | "web";

function normalizeDeployment(value: string | undefined): TeamWorkDeployment {
  const normalized = value?.trim().toLowerCase();
  return normalized === "web" ? "web" : "desktop";
}

export function getTeamWorkDeployment(): TeamWorkDeployment {
  const envValue =
    typeof import.meta !== "undefined" && typeof import.meta.env?.VITE_TEAMWORK_DEPLOYMENT === "string"
      ? import.meta.env.VITE_TEAMWORK_DEPLOYMENT
      : undefined;

  return normalizeDeployment(envValue);
}

export function isWebDeployment(): boolean {
  return getTeamWorkDeployment() === "web";
}

export function isDesktopDeployment(): boolean {
  return getTeamWorkDeployment() === "desktop";
}
