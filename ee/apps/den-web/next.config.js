const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@teamwork/ui", "@teamwork-ee/utils"],
  outputFileTracingRoot: path.join(__dirname, "../../.."),
};

module.exports = nextConfig;
