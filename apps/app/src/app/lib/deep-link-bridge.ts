export const deepLinkBridgeEvent = "teamwork:deep-link";
export const nativeDeepLinkEvent = "teamwork:deep-link-native";

export type DeepLinkBridgeDetail = {
  urls: string[];
};

declare global {
  interface Window {
    __TEAMWORK__?: {
      deepLinks?: string[];
    };
  }
}

function normalizeDeepLinks(urls: readonly string[]): string[] {
  return urls.map((url) => url.trim()).filter(Boolean);
}

export function pushPendingDeepLinks(target: Window, urls: readonly string[]): string[] {
  const normalized = normalizeDeepLinks(urls);
  if (normalized.length === 0) {
    return [];
  }

  target.__TEAMWORK__ ??= {};
  const pending = target.__TEAMWORK__.deepLinks ?? [];
  target.__TEAMWORK__.deepLinks = [...pending, ...normalized];
  target.dispatchEvent(
    new CustomEvent<DeepLinkBridgeDetail>(deepLinkBridgeEvent, {
      detail: { urls: normalized },
    }),
  );
  return normalized;
}

export function drainPendingDeepLinks(target: Window): string[] {
  const pending = target.__TEAMWORK__?.deepLinks ?? [];
  if (target.__TEAMWORK__) {
    target.__TEAMWORK__.deepLinks = [];
  }
  return [...pending];
}
