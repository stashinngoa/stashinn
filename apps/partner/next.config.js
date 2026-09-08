/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@stashinn/lib"],
  serverExternalPackages: ['jspdf', 'fflate'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  }
};

export default nextConfig;
