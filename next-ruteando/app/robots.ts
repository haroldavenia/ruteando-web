import type { MetadataRoute } from 'next';

import { AI_CRAWLERS, PRIVATE_PATHS, SITE_URL } from '@/lib/site';

/**
 * Lo público se puede rastrear (buscadores y motores de IA generativa, nombrados para que la decisión quede explícita) y lo privado, no.
 * Lo privado además exige sesión, y sus páginas llevan `noindex`: esto solo ahorra visitas inútiles.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [...PRIVATE_PATHS];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: [...AI_CRAWLERS], allow: ['/', '/llms.txt'], disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
