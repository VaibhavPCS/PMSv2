import type { NextConfig } from "next";

const config: NextConfig = {
  // Lean, self-contained server bundle for the Docker runtime image.
  output: "standalone",
  transpilePackages: ["../../shared"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  compiler: {
    styledComponents: true,
  },
  async rewrites() {
    if (process.env.NEXT_PUBLIC_LOCAL_GATEWAY !== "true") return [];
    const svc = (port: number, path: string) => ({
      source: `/api/v1/${path}/:rest*`,
      destination: `http://localhost:${port}/api/v1/${path}/:rest*`,
    });
    return [
      // SuperTokens session endpoints live under /auth/* (not /api/v1/*).
      { source: "/auth/:rest*", destination: "http://localhost:4001/auth/:rest*" },
      svc(4001, "auth"),
      svc(4002, "workspaces"),
      svc(4003, "projects"),
      svc(4004, "tasks"),
      svc(4004, "sprints"),
      svc(4004, "recurring"),
      svc(4004, "imports"),
      svc(4005, "notifications"),
      svc(4006, "workflows"),
      svc(4007, "chats"),
      svc(4007, "messages"),
      svc(4008, "files"),
      svc(4009, "meetings"),
      svc(4010, "comments"),
    ];
  },
};

export default config;