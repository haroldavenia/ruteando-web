import type { MetadataRoute } from 'next';

import { LEGAL_INFO } from '@/lib/legal/legal-docs';
import { PUBLIC_PATHS, SITE_URL } from '@/lib/site';

/** Solo las páginas públicas; `/` lleva a `/access` sin sesión, así que se publica la de presentación (`/about`) y el acceso. */
export default function sitemap(): MetadataRoute.Sitemap {
  const legalDate = new Date(`${LEGAL_INFO.updated}T12:00:00Z`);
  return PUBLIC_PATHS.filter((path) => path !== '/').map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: path.startsWith('/legal') ? legalDate : undefined,
    changeFrequency: path.startsWith('/legal') ? 'yearly' : 'monthly',
    priority: path === '/about' ? 0.9 : path === '/access' ? 0.8 : 0.4,
  }));
}
