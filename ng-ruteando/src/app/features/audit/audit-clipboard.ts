import { Injector } from '@angular/core';

import { t } from '../../core/i18n/i18n';
import { notify } from '../../shared/form/notify';
/**
 * Copia un texto al portapapeles y avisa. Si el navegador no lo permite (página sin HTTPS, permiso denegado) el aviso trae el
 * texto para copiarlo a mano.
 */
export async function copyToClipboard(
  document: Document,
  injector: Injector,
  text: string,
  what: string
): Promise<void> {
  try {
    await document.defaultView?.navigator.clipboard.writeText(text);
    void notify(injector, t('{0} copiado', [what]));
  } catch {
    void notify(injector, t('No se pudo copiar automáticamente. Cópialo a mano: {0}', [text]));
  }
}
