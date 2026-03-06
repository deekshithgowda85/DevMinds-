import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that use dynamic require() / CJS internals must be excluded from
  // the Next.js bundle and required at runtime instead.
  serverExternalPackages: [
    'e2b',
    '@inngest/agent-kit',
    'inngest',
    '@opentelemetry/instrumentation-winston',
    '@opentelemetry/auto-instrumentations-node',
  ],
  webpack: (config) => {
    // Suppress any residual "Critical dependency" webpack warnings from
    // packages that use dynamic require() expressions internally.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@opentelemetry/ },
      { module: /node_modules\/inngest/ },
      { module: /node_modules\/@inngest/ },
    ];
    return config;
  },
};

export default nextConfig;
