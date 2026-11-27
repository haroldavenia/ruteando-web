'use client';

import { useMemo } from 'react';

import { type Format, makeFormat } from '@/lib/format';
import { useLang, useT } from '@/lib/i18n/client';

/** Los formatos del idioma activo (estables mientras no cambie). */
export function useFormat(): Format {
  const t = useT();
  const lang = useLang();
  return useMemo(() => makeFormat(t, lang), [t, lang]);
}
