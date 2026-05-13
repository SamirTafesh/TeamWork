import { normalizeServerBaseUrl } from "../client.js";
import type { TeamWorkServerV2WorkspaceEvent } from "../../generated/types.gen";
import {
  createTeamWorkServerEventStream,
  type TeamWorkServerEventStreamOptions,
  type TeamWorkServerEventStreamResult,
} from "./sse.js";

export type TeamWorkServerWorkspaceEvent = TeamWorkServerV2WorkspaceEvent;

export type TeamWorkServerWorkspaceEventStreamOptions = Omit<
  TeamWorkServerEventStreamOptions<TeamWorkServerWorkspaceEvent>,
  "url"
> & {
  baseUrl: string;
  workspaceId: string;
};

export type TeamWorkServerWorkspaceEventStreamResult = TeamWorkServerEventStreamResult<TeamWorkServerWorkspaceEvent>;

export function createTeamWorkServerWorkspaceEventStream(
  options: TeamWorkServerWorkspaceEventStreamOptions,
): TeamWorkServerWorkspaceEventStreamResult {
  const baseUrl = normalizeServerBaseUrl(options.baseUrl);
  const url = `${baseUrl}/workspaces/${encodeURIComponent(options.workspaceId)}/events`;
  return createTeamWorkServerEventStream<TeamWorkServerWorkspaceEvent>({
    ...options,
    url,
  });
}
