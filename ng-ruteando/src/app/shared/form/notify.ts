import { Injector } from '@angular/core';

import { t } from '../../core/i18n/i18n';
/** Aviso breve con el snack-bar, cargado de forma diferida para no engordar el bundle de acceso. */
export async function notify(injector: Injector, message: string): Promise<void> {
  const { MatSnackBar } = await import('@angular/material/snack-bar');
  injector.get(MatSnackBar).open(message, t('Cerrar'), { duration: 6000 });
}
