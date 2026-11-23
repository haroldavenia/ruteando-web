import { ApiError } from '../../core/api/api-error';
import { t } from '../../core/i18n/i18n';
/** Texto de un fallo de la API: el mensaje de la pantalla para ese estado, o el del propio error. */
export function messageFor(error: unknown, byStatus: Readonly<Record<number, string>> = {}): string {
  if (error instanceof ApiError) {
    return byStatus[error.status] ?? error.message;
  }
  return t('No se pudo completar la solicitud');
}
