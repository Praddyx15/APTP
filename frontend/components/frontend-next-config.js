/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  
  // Configure image domains for remote images
  images: {
    domains: [
      'localhost',
      'api.pilottrainingplatform.com',
      'storage.pilottrainingplatform.com',
      'assets.pilottrainingplatform.com'
    ],
  },
  
  // API route proxy configuration (development environment)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL ? 
          `${process.env.NEXT_PUBLIC_API_URL}/:path*` : 
          'http://localhost:8080/api/:path*',
      },
    ];
  },
  
  // Add internationalization support
  i18n: {
    locales: ['en', 'fr', 'es', 'de', 'zh'],
    defaultLocale: 'en',
    localeDetection: true,
  },
  
  // Custom webpack configuration for specialized libraries
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle .glb and .gltf 3D model files
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/files',
          outputPath: 'static/files',
          name: '[name].[hash].[ext]',
        },
      },
    });

    // Optimize SVGs
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // Performance optimizations
    if (!dev && !isServer) {
      // Enable production optimizations
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          commons: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 10,
          },
          three: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: 'three-js',
            chunks: 'all',
            priority: 9,
          },
        },
      };
    }

    return config;
  },
  
  // Enable SWC compiler with additional features
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['three'],
    instrumentationHook: true,
  },
  
  // Environment variables that should be accessible in the browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'Advanced Pilot Training Platform',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NODE_ENV || 'development',
  },
}

module.exports = nextConfig