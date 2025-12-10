/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Turbopack configuration for Next.js 16
  turbopack: {
    resolveAlias: {
      buffer: 'buffer',
    },
  },
  // Webpack config for when using --webpack flag
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        buffer: require.resolve('buffer'),
      };
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      buffer: require.resolve('buffer'),
    };
    return config;
  },
};

module.exports = nextConfig;


