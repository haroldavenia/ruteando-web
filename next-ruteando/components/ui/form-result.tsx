import { RiCheckboxCircleLine, RiErrorWarningLine } from '@remixicon/react';

import { Icon } from './icon';

/**
 * Resultado de un envío. Los dos contenedores existen SIEMPRE en el DOM (una región `aria-live` creada junto con su contenido no siempre
 * se anuncia): `role="alert"` para errores y `role="status"` para confirmaciones, sin mover el foco. Vacíos no ocupan sitio.
 */
export function FormResult({ error, success }: { error?: string | null; success?: string | null }) {
  const box = 'flex items-start gap-2.5 rounded-control px-4 py-3 text-sm empty:hidden';
  return (
    <>
      <div role="alert" className={`${box} bg-error-container text-on-error-container`}>
        {error ? (
          <>
            <Icon icon={RiErrorWarningLine} size={20} />
            <span>{error}</span>
          </>
        ) : null}
      </div>
      <div role="status" aria-live="polite" className={`${box} bg-success-container text-on-success-container`}>
        {success ? (
          <>
            <Icon icon={RiCheckboxCircleLine} size={20} />
            <span>{success}</span>
          </>
        ) : null}
      </div>
    </>
  );
}
