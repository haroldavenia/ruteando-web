import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // `next dev` escribe un AGENTS.md con instrucciones propias en el repositorio: no se quiere (y desaparece si ya existía)
  agentRules: false,
  reactStrictMode: true,
  // Las URI de redirección registradas en Google, GitHub y Apple no cambian: el BFF atiende /gateway/sso/* donde antes lo hacía Express.
  async headers() {
    return [
      // El worker y el manifiesto no se guardan en la caché del navegador: si no, una versión nueva tardaría en verse
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      { source: '/manifest.webmanifest', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      { source: '/icons/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
  async rewrites() {
    return [{ source: '/gateway/sso/:path*', destination: '/middleware/sso/:path*' }];
  },
};

export default config;
