/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'aptp-assets.yourdomain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  eslint: {
    dirs: ['pages', 'components', 'hooks', 'services', 'visualizations', 'collaboration', 'styles'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['three'],
    optimizeCss: true,
    scrollRestoration: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/document/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/document/:path*`,
      },
      {
        source: '/api/syllabus/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/syllabus/:path*`,
      },
      {
        source: '/api/assessment/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/assessment/:path*`,
      },
      {
        source: '/api/user/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/user/:path*`,
      },
      {
        source: '/api/scheduler/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/scheduler/:path*`,
      },
      {
        source: '/api/analytics/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/analytics/:path*`,
      },
      {
        source: '/api/compliance/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/compliance/:path*`,
      },
      {
        source: '/api/collaboration/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/collaboration/:path*`,
      },
      {
        source: '/api/visualization/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/visualization/:path*`,
      },
      {
        source: '/api/integration/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/integration/:path*`,
      },
      {
        source: '/api/security/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/security/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  webpack(config) {
    // SVG Loader
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // GLSL Shader Loader for Three.js
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader', 'glslify-loader'],
    });

    return config;
  },
};

module.exports = withPWA(nextConfig);
