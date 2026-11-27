'use client';

import { RiTruckLine, RiUserAddLine, RiUserUnfollowLine } from '@remixicon/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EntityList } from '@/components/page/entity-list';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { useNotify } from '@/components/ui/toast';
import type { Resource, ResourceInput } from '@/lib/api/models';
import { requestJson } from '@/lib/api-client';
import { vehiclesToCsv } from '@/lib/fleet/export';
import { driverName, vehicleLabel } from '@/lib/fleet/labels';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { useCrud } from '@/lib/hooks/use-crud';
import { useT } from '@/lib/i18n/client';
import type { Column } from '@/lib/list/list-logic';

import { AssignDriverDialog } from './assign-driver-dialog';
import { FleetTabs } from './fleet-tabs';

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0].toUpperCase())
    .join('');

/** Listado de vehículos: tarjetas o tabla, y asignar, cambiar o retirar el conductor. */
export function ResourceList() {
  const t = useT();
  const notify = useNotify();
  const api = useCrud<Resource, ResourceInput>('resources');
  const { ask, dialog } = useConfirm();
  const [assigning, setAssigning] = useState<Resource | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo<Column<Resource>[]>(
    () => [
      { id: 'name', header: t('Nombre'), cell: (r) => r.name, kind: 'strong', primary: true },
      { id: 'licensePlate', header: t('Matrícula'), cell: (r) => r.licensePlate ?? '', kind: 'id' },
      { id: 'type', header: t('Tipo'), cell: (r) => r.resourceType?.name ?? '', kind: 'muted' },
      {
        id: 'driver',
        header: t('Conductor'),
        cell: (r) => (r.assignedUser ? `${driverName(r.assignedUser)} (${r.assignedUser.email})` : t('Sin conductor')),
      },
    ],
    [t]
  );

  async function assign(vehicle: Resource, driverId: string) {
    setAssigning(null);
    setError(null);
    try {
      const updated = await requestJson<Resource>(
        'PUT',
        `/middleware/data/resources/${encodeURIComponent(vehicle.id)}/driver/${encodeURIComponent(driverId)}`,
        undefined,
        t
      );
      notify(
        t('Conductor asignado al vehículo «{0}»: {1}', [
          vehicleLabel(vehicle),
          updated.assignedUser ? driverName(updated.assignedUser) : '',
        ]).replace(/: $/, '')
      );
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    }
  }

  async function unassign(vehicle: Resource) {
    setError(null);
    const ok = await ask({
      title: t('Retirar conductor'),
      message: t('¿Retirar a {0} del vehículo «{1}»?', [
        vehicle.assignedUser ? driverName(vehicle.assignedUser) : t('el conductor'),
        vehicleLabel(vehicle),
      ]),
      confirmLabel: t('Retirar'),
    });
    if (!ok) return;
    try {
      await requestJson('DELETE', `/middleware/data/resources/${encodeURIComponent(vehicle.id)}/driver`, undefined, t);
      notify(t('El vehículo «{0}» ya no tiene conductor', [vehicleLabel(vehicle)]));
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    }
  }

  return (
    <>
      <EntityList<Resource>
        key={version}
        title={t('Vehículos')}
        singular={t('vehículo')}
        plural={t('vehículos')}
        fetchPage={api.list}
        above={
          <>
            <FleetTabs />
            {error ? (
              <p
                role="alert"
                className="mb-3 rounded-control bg-error-container px-4 py-3 text-sm text-on-error-container"
              >
                {error}
              </p>
            ) : null}
          </>
        }
        columns={columns}
        newHref="/fleet/vehicles/new"
        newLabel={t('Nuevo vehículo')}
        emptyMessage={t('Todavía no hay vehículos')}
        emptyActionLabel={t('Crear el primer vehículo')}
        searchPlaceholder={t('Buscar por nombre, matrícula o conductor')}
        rowLabel={vehicleLabel}
        editHref={(r) => `/fleet/vehicles/${encodeURIComponent(r.id)}`}
        editLabel={(r) => t('Editar vehículo ') + vehicleLabel(r)}
        remove={(r, messages) => api.remove(r.id, messages)}
        fileBase="vehiculos"
        csv={(rows) => vehiclesToCsv(rows, t)}
        extraActions={(row) => (
          <>
            {row.assignedUser ? (
              <IconButton
                icon={RiUserUnfollowLine}
                label={t('Retirar conductor del vehículo ') + vehicleLabel(row)}
                onClick={() => void unassign(row)}
              />
            ) : null}
            <IconButton
              icon={RiUserAddLine}
              label={
                (row.assignedUser ? t('Cambiar conductor del vehículo ') : t('Asignar conductor al vehículo ')) +
                vehicleLabel(row)
              }
              onClick={() => setAssigning(row)}
            />
          </>
        )}
        card={({ row, selectable, selected, toggle }) => (
          <article
            className={`flex h-full flex-col gap-3 rounded-card border p-4 ${selected ? 'border-primary bg-primary-container/40' : 'border-outline-variant bg-surface'}`}
          >
            <header className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
                <Icon icon={RiTruckLine} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium">{row.name}</h3>
                <span className="text-sm text-on-surface-variant">{row.resourceType?.name ?? ''}</span>
              </div>
              {row.licensePlate ? (
                <span className="rounded-sm border border-outline px-1.5 font-mono text-sm">{row.licensePlate}</span>
              ) : null}
            </header>
            <div className="flex items-center gap-3">
              {row.assignedUser ? (
                <>
                  <span
                    aria-hidden="true"
                    className="grid size-9 place-items-center rounded-full bg-primary-container text-sm font-medium text-on-primary-container"
                  >
                    {initialsOf(driverName(row.assignedUser))}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col text-sm">
                    {driverName(row.assignedUser)}
                    <small className="truncate text-on-surface-variant">{row.assignedUser.email}</small>
                  </span>
                  {!row.active ? <StatusBadge>{t('Inactivo')}</StatusBadge> : null}
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-on-surface-variant">{t('Sin conductor')}</span>
                  <Button
                    variant="outlined"
                    aria-label={t('Asignar conductor al vehículo ') + vehicleLabel(row)}
                    onClick={() => setAssigning(row)}
                  >
                    {t('Asignar')}
                  </Button>
                </>
              )}
            </div>
            <footer className="mt-auto flex items-center gap-1">
              {selectable ? (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={toggle}
                  aria-label={t('Elegir vehículo ') + vehicleLabel(row)}
                  title={t('Elegir')}
                  className="size-5 cursor-pointer accent-primary"
                />
              ) : null}
              <Link
                href={`/fleet/vehicles/${encodeURIComponent(row.id)}`}
                className="ml-auto rounded-control px-3 py-2 text-sm text-primary hover:bg-primary/8"
              >
                {t('Editar')}
              </Link>
            </footer>
          </article>
        )}
      />
      {assigning ? (
        <AssignDriverDialog
          vehicle={vehicleLabel(assigning)}
          currentDriverId={assigning.driverId}
          onPick={(driverId) => void assign(assigning, driverId)}
          onClose={() => setAssigning(null)}
        />
      ) : null}
      {dialog}
    </>
  );
}
