/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@stashinn/lib"],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  serverActions: {
    bodySizeLimit: '10mb',
  },
};

export default nextConfig;
