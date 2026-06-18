import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TODO: Remove ignoreBuildErrors after fixing the 98 TS errors.
  // 78 errors are in lib/informes-rayo/pdf-chartjs/slides/ (color property names
  // that don't exist on the color type — crema, madera, dorado, etc.).
  // 20 errors are in components/ui/ (motion/react declarations, @radix-ui/react-slot
  // missing) and a few in rodri tabs and AdminShell.
  // Until those are fixed, removing this flag will break the Vercel build.
  typescript: { ignoreBuildErrors: true },
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api.groq.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
