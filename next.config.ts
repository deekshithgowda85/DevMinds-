import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress "Critical dependency" warnings from e2b package
    // (e2b uses dynamic require() internally — harmless)
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('e2b');
      }
    }
    return config;
  },
};

export default nextConfig;
