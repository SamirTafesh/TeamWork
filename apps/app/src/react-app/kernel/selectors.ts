import type { TeamworkStore } from "./store";

export const selectActiveWorkspace = (state: TeamworkStore) =>
  state.workspaces.find(
    (workspace) => workspace.id === state.activeWorkspaceId,
  ) ?? null;

export const selectServerStatus = (state: TeamworkStore) => state.server.status;

export const selectServerUrl = (state: TeamworkStore) => state.server.url;

export const selectErrorBanner = (state: TeamworkStore) => state.errorBanner;
