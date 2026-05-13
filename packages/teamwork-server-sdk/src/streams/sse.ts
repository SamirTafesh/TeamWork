import { createSseClient } from "../../generated/core/serverSentEvents.gen";
import type { ServerSentEventsOptions, ServerSentEventsResult, StreamEvent } from "../../generated/core/serverSentEvents.gen";

export type TeamWorkServerEventStreamOptions<TData = unknown> = ServerSentEventsOptions<TData>;
export type TeamWorkServerEventStreamResult<TData = unknown> = ServerSentEventsResult<TData>;
export type TeamWorkServerStreamEvent<TData = unknown> = StreamEvent<TData>;

export function createTeamWorkServerEventStream<TData = unknown>(options: TeamWorkServerEventStreamOptions<TData>) {
  return createSseClient<TData>(options as ServerSentEventsOptions<unknown>) as TeamWorkServerEventStreamResult<TData>;
}
