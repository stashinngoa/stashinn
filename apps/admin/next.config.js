/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@stashinn/lib"],
  serverExternalPackages: ['jspdf', 'fflate'],
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
