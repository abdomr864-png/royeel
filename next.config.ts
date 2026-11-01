import type { NextConfig } from "next";

// Pin the project root: a package-lock.json in the user's home folder
// otherwise makes Next.js treat the whole home folder as the workspace.
const root = process.cwd();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Reminds to upgrade when the installed version has a security advisory.
    agentUpgrade: "security",
  },
  outputFileTracingRoot: root,
  turbopack: {
    root,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    qualities: [75, 90],
  },
};

export default nextConfig;
