import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  turbopack: {
    resolveAlias: {
      'victory-vendor/d3-shape': 'd3-shape',
      'victory-vendor/d3-scale': 'd3-scale',
      'victory-vendor/d3-array': 'd3-array',
      'victory-vendor/d3-color': 'd3-color',
      'victory-vendor/d3-ease': 'd3-ease',
      'victory-vendor/d3-format': 'd3-format',
      'victory-vendor/d3-interpolate': 'd3-interpolate',
      'victory-vendor/d3-path': 'd3-path',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'victory-vendor/d3-shape': 'd3-shape',
      'victory-vendor/d3-scale': 'd3-scale',
      'victory-vendor/d3-array': 'd3-array',
      'victory-vendor/d3-color': 'd3-color',
      'victory-vendor/d3-ease': 'd3-ease',
      'victory-vendor/d3-format': 'd3-format',
      'victory-vendor/d3-interpolate': 'd3-interpolate',
      'victory-vendor/d3-path': 'd3-path',
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubdomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api.groq.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;