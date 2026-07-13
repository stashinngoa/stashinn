/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@stashinn/lib"],
  serverExternalPackages: ['jspdf', 'fflate'],
};

export default nextConfig;
