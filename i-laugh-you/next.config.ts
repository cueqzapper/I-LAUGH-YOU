import type { NextConfig } from "next";

const BUILD_ID =
  process.env.BUILD_ID ||
  `${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12)}`;

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  generateBuildId: async () => BUILD_ID,
  env: {
    NEXT_BUILD_ID: BUILD_ID,
  },
  async headers() {
    return [
      {
        source:
          "/((?!_next/static|_next/image|api|favicon\\.ico|robots\\.txt|sitemap\\.xml|img/|images/|icons/).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
