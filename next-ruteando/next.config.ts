import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Las URI de redirección registradas en Google, GitHub y Apple no cambian: el BFF atiende /gateway/sso/* donde antes lo hacía Express.
  async rewrites() {
    return [{ source: '/gateway/sso/:path*', destination: '/middleware/sso/:path*' }];
  },
};

export default config;
