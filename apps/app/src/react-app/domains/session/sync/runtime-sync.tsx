/** @jsxImportSource react */
import { useEffect } from "react";

import { ensureWorkspaceSessionSync, trackWorkspaceSessionSync } from "./session-sync";

type ReactSessionRuntimeProps = {
  workspaceId: string;
  sessionId: string | null;
  opencodeBaseUrl: string;
  teamworkToken: string;
};

export function ReactSessionRuntime(props: ReactSessionRuntimeProps) {
  useEffect(() => {
    return ensureWorkspaceSessionSync({
      workspaceId: props.workspaceId,
      baseUrl: props.opencodeBaseUrl,
      teamworkToken: props.teamworkToken,
    });
  }, [props.workspaceId, props.opencodeBaseUrl, props.teamworkToken]);

  useEffect(() => {
    return trackWorkspaceSessionSync(
      {
        workspaceId: props.workspaceId,
        baseUrl: props.opencodeBaseUrl,
        teamworkToken: props.teamworkToken,
      },
      props.sessionId,
    );
  }, [props.workspaceId, props.sessionId, props.opencodeBaseUrl, props.teamworkToken]);

  return null;
}
