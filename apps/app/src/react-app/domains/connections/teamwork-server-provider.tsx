/** @jsxImportSource react */
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { TeamworkServerStore } from "./teamwork-server-store";

const TeamworkServerContext = createContext<TeamworkServerStore | null>(null);

export function TeamworkServerProvider(props: {
  store: TeamworkServerStore;
  children: ReactNode;
}) {
  return (
    <TeamworkServerContext.Provider value={props.store}>
      {props.children}
    </TeamworkServerContext.Provider>
  );
}

export function useTeamworkServer() {
  const store = useContext(TeamworkServerContext);
  if (!store) {
    throw new Error("useTeamworkServer must be used within an TeamworkServerProvider");
  }

  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return store;
}
