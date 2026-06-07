/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
      '@shared': require('path').resolve(__dirname, 'shared'),
      'drizzle-orm': require('path').resolve(__dirname, 'node_modules', 'drizzle-orm'),
      'drizzle-zod': require('path').resolve(__dirname, 'node_modules', 'drizzle-zod'),
    };
    config.resolve.modules = [
      require('path').resolve(__dirname, 'node_modules'),
      'node_modules',
    ];
    return config;
  },
};

module.exports = nextConfig;
