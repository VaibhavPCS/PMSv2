import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  transpilePackages: ["../../shared"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.alias["@shared"] = path.resolve(__dirname, "../../shared");
    return webpackConfig;
  },
};

export default config;
