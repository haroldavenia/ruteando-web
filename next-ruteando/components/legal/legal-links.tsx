import Link from 'next/link';

import { cn } from '@/lib/cn';
import { getT } from '@/lib/i18n/server';
import { LEGAL_DOCS, type LegalDoc, legalTitle } from '@/lib/legal/legal-docs';

/**
 * Pie con los enlaces a los documentos legales y el derecho de autor con la atribución «by Hanoit, LLC» (solo texto: no enlaza a la web de
 * Hanoit). Va al final de las pantallas de acceso y de cada documento, donde `current` marca el que se está leyendo. `replace`: dentro de un
 * documento, pasar de uno a otro reemplaza la entrada del historial, así que «Volver» sigue llevando a donde se estaba.
 */
export async function LegalLinks({ current, replace }: { current?: LegalDoc; replace?: boolean }) {
  const t = await getT();
  return (
    <nav
      aria-label={t('Información legal')}
      className="flex flex-wrap items-center gap-x-4 text-xs text-on-surface-variant"
    >
      {LEGAL_DOCS.map((doc) => (
        <Link
          key={doc}
          href={`/legal/${doc}`}
          replace={replace}
          aria-current={doc === current ? 'page' : undefined}
          className={cn(
            'rounded-sm py-2.5 underline underline-offset-3 hover:text-primary',
            doc === current && 'font-medium text-on-surface no-underline'
          )}
        >
          {legalTitle(doc, t)}
        </Link>
      ))}
      <span className="ms-auto">© {new Date().getFullYear()} Ruteando by Hanoit, LLC</span>
    </nav>
  );
}
