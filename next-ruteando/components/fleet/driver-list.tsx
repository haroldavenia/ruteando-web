'use client';

import { RiLockPasswordLine } from '@remixicon/react';
import { useMemo, useState } from 'react';

import { EntityList } from '@/components/page/entity-list';
import { IconButton } from '@/components/ui/icon-button';
import { useNotify } from '@/components/ui/toast';
import { arrayPage } from '@/lib/api/array-page';
import type { User, UserInput } from '@/lib/api/models';
import { getData, requestJson } from '@/lib/api-client';
import { driversToCsv } from '@/lib/fleet/export';
import { driverName, identifierText } from '@/lib/fleet/labels';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { useCrud } from '@/lib/hooks/use-crud';
import { useT } from '@/lib/i18n/client';
import type { Column } from '@/lib/list/list-logic';

import { FleetTabs } from './fleet-tabs';

/** Listado de conductores (usuarios con rol `driver`; el gateway los da en un arreglo, sin páginas). */
export function DriverList() {
  const t = useT();
  const notify = useNotify();
  const api = useCrud<User, UserInput>('users');
  const { ask, dialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const assigned = t('No se puede eliminar: el conductor está asignado a un vehículo');

  const fetchPage = useMemo(() => arrayPage(() => getData<User[]>('users/drivers', t)), [t]);

  const columns = useMemo<Column<User>[]>(
    () => [
      { id: 'name', header: t('Nombre'), cell: (u) => driverName(u), kind: 'strong', primary: true },
      { id: 'email', header: t('Correo'), cell: (u) => u.email },
      { id: 'phone', header: t('Teléfono'), cell: (u) => u.phone ?? '' },
      { id: 'document', header: t('Documento'), cell: (u) => identifierText(u, t) },
      { id: 'active', header: t('Estado'), cell: (u) => (u.active ? t('Activo') : t('Inactivo')) },
    ],
    [t]
  );

  async function sendReset(user: User) {
    setError(null);
    const ok = await ask({
      title: t('Enviar enlace de restablecimiento'),
      message: t('Se enviará a {0} un enlace para restablecer su contraseña.', [user.email]),
      confirmLabel: t('Enviar enlace'),
    });
    if (!ok) return;
    try {
      await requestJson('POST', `/middleware/data/users/${encodeURIComponent(user.id)}/reset-password`, undefined, t);
      notify(t('Enlace de restablecimiento enviado a {0}', [user.email]));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    }
  }

  return (
    <>
      <EntityList<User>
        selectable
        title={t('Conductores')}
        singular={t('conductor')}
        plural={t('conductores')}
        fetchPage={fetchPage}
        above={
          <>
            <FleetTabs />
            {error ? (
              <p role="alert" className="rounded-control bg-error-container px-4 py-3 text-sm text-on-error-container">
                {error}
              </p>
            ) : null}
          </>
        }
        columns={columns}
        newHref="/fleet/drivers/new"
        newLabel={t('Nuevo conductor')}
        emptyMessage={t('Todavía no hay conductores')}
        emptyActionLabel={t('Crear el primer conductor')}
        searchPlaceholder={t('Buscar por nombre, correo o documento')}
        rowLabel={driverName}
        editHref={(u) => `/fleet/drivers/${encodeURIComponent(u.id)}`}
        editLabel={(u) => t('Editar conductor ') + driverName(u)}
        remove={(u, messages) => api.remove(u.id, messages)}
        byStatus={{ 400: assigned, 409: assigned }}
        fileBase="conductores"
        csv={(rows) => driversToCsv(rows, t)}
        extraActions={(user) => (
          <IconButton
            icon={RiLockPasswordLine}
            label={t('Enviar enlace de restablecimiento a ') + user.email}
            onClick={() => void sendReset(user)}
          />
        )}
      />
      {dialog}
    </>
  );
}
