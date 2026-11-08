/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@stashinn/lib"],
  serverExternalPackages: ['jspdf', 'fflate'],
  experimental: {
    // Uploads (signed registration forms, settlement proofs) go through server actions, which
    // reject bodies over 1 MB by default. Files may be up to 10 MB, plus form overhead.
    serverActions: {
      bodySizeLimit: '12mb',
    },
    // The middleware reads request bodies too and caps them at 10 MB by default
    proxyClientMaxBodySize: '12mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321', // typical local supabase port
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321', // typical local supabase port
        pathname: '/storage/v1/object/sign/**',
      }
    ],
  },
};

export default nextConfig;
