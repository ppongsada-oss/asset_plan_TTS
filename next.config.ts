import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

// Initialize Cloudflare local environment for Next.js dev server
if (process.env.NODE_ENV === "development") {
  setupDevPlatform({ persist: false });
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
