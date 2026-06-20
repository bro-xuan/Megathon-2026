import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray pnpm-lock.yaml in the home dir otherwise makes
  // Next infer the wrong root (warning on dev start).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
