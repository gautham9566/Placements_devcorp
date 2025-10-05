/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict mode for better development experience
  reactStrictMode: true,

  // Optimize webpack configuration
  webpack: (config, { dev }) => {
    // Only add essential optimizations
    if (dev) {
      // Faster rebuilds in development
      config.watchOptions = {
        poll: false, // Use native file watching instead of polling
        aggregateTimeout: 200, // Reduced timeout
      };

      // Better development performance
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }

    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@tabler/icons-react', 'framer-motion'],
  },

  // Turbopack configuration (stable in Next.js 15)
  turbo: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Enable SWC minification (this is default in Next.js 15)
  // swcMinify: true, // Removed - deprecated option

  // Enable output file tracing for better performance
  // outputFileTracing: false, // Removed - deprecated option
};

export default nextConfig;