/**
 * Dirección pública del sitio, para los metadatos absolutos (Open Graph, sitemap, robots, datos estructurados). `SITE_URL` se define en
 * producción (sin barra final); sin ella, el desarrollo local.
 */
export const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);

export const SITE_NAME = 'Ruteando';

/** Páginas públicas que se publican en el sitemap (las privadas piden sesión y no se indexan). */
export const PUBLIC_PATHS = [
  '/',
  '/about',
  '/access',
  '/access/register',
  '/legal/privacy',
  '/legal/terms',
  '/legal/sms',
] as const;

/** Rastreadores de motores de IA generativa a los que se permite leer lo público (GEO). */
export const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
] as const;

/** Zonas privadas o técnicas: ningún rastreador entra (siguen exigiendo sesión aunque entrara). */
export const PRIVATE_PATHS = [
  '/middleware/',
  '/gateway/',
  '/fleet',
  '/places',
  '/zones',
  '/packages',
  '/settings',
  '/journeys',
  '/assigned-services',
  '/catalogs',
  '/audit',
  '/profile',
  '/security',
  '/forbidden',
  '/design',
] as const;
