import { strict as assert } from "node:assert";

import { describeBundleUrlTrust, isConfiguredBundlePublisherUrl } from "../src/app/bundles/url-policy";

const trusted = describeBundleUrlTrust(
  "https://share.teamworklabs.com/b/01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "https://share.teamworklabs.com",
);

assert.deepEqual(trusted, {
  trusted: true,
  bundleId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  actualOrigin: "https://share.teamworklabs.com",
  configuredOrigin: "https://share.teamworklabs.com",
});

const untrusted = describeBundleUrlTrust(
  "https://evil.example/b/01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "https://share.teamworklabs.com",
);

assert.deepEqual(untrusted, {
  trusted: false,
  bundleId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  actualOrigin: "https://evil.example",
  configuredOrigin: "https://share.teamworklabs.com",
});

assert.equal(
  isConfiguredBundlePublisherUrl(
    "https://share.teamworklabs.com/b/01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "https://share.teamworklabs.com",
  ),
  true,
);

assert.equal(
  isConfiguredBundlePublisherUrl(
    "https://share.teamworklabs.com/not-a-bundle",
    "https://share.teamworklabs.com",
  ),
  false,
);

console.log("bundle-url-policy ok");
