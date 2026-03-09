import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that use dynamic require() / CJS internals must be excluded from
  // the Next.js bundle and required at runtime instead.
  // NOTE: 'e2b' is intentionally NOT listed here — it must be bundled so that
  // Vercel serverless functions include it in their deployment package.
  // Listing it as external causes the module-level import to fail on Vercel,
  // which prevents route handlers from being registered (returns HTTP 405).
  serverExternalPackages: [
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
