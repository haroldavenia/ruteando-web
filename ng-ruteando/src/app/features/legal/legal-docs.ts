import { t } from '../../core/i18n/i18n';

/** Documentos legales públicos: el texto va en la dirección (`/legal/privacy`). */
export const LEGAL_DOCS = ['privacy', 'terms', 'sms'] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

/**
 * Datos que hay que completar antes de publicar. El contenido de los documentos es un BORRADOR sin revisión legal: debe revisarlo
 * quien responda legalmente por el servicio (titular, jurisdicción, plazos de conservación) antes de darlo por bueno.
 */
export const LEGAL_INFO = {
  /** Correo al que escribir por privacidad y soporte. Vacío = el documento remite a quien administra la empresa. */
  contactEmail: '',
  /** Fecha de la última revisión del contenido (AAAA-MM-DD). */
  updated: '2026-11-13',
};

/** Nombre corto de cada documento: el pie del acceso, el título de la página y la navegación entre ellos. */
export function legalTitle(doc: LegalDoc): string {
  switch (doc) {
    case 'privacy':
      return t('Política de privacidad');
    case 'terms':
      return t('Términos y condiciones');
    case 'sms':
      return t('Verificación por SMS');
  }
}
