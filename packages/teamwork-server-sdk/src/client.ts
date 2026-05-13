import { createClient } from "../generated/client/index";
import type { Client, Config, CreateClientConfig } from "../generated/client/index";

export type TeamWorkServerClientConfig = Config;
export type TeamWorkServerClient = Client;
export type TeamWorkServerClientFactory = CreateClientConfig;

export function normalizeServerBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "") || baseUrl;
}

export function createTeamWorkServerClient(config: TeamWorkServerClientConfig = {}): TeamWorkServerClient {
  return createClient({
    ...config,
    baseUrl: config.baseUrl ? normalizeServerBaseUrl(config.baseUrl) : config.baseUrl,
  });
}
