'use client';

import { RiFileUploadLine, RiLoopLeftLine } from '@remixicon/react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { EntityList } from '@/components/page/entity-list';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { useNotify } from '@/components/ui/toast';
import type { Package, PackageInput } from '@/lib/api/models';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { useCrud } from '@/lib/hooks/use-crud';
import { runBulk } from '@/lib/hooks/use-delete';
import { useFormat } from '@/lib/hooks/use-format';
import { useMasterDomain } from '@/lib/hooks/use-master-domain';
import { useT } from '@/lib/i18n/client';
import type { Column, Facet } from '@/lib/list/list-logic';
import { packagesToCsv } from '@/lib/packages/export';
import {
  DEFAULT_PACKAGE_STATUSES,
  packageLabel,
  packageStatusLabel,
  packageStatusOrder,
  serviceTypeLabel,
} from '@/lib/packages/labels';
import { setPackageStatus } from '@/lib/packages/status-change';
import { statusTone } from '@/lib/status-tone';

/** Listado de paquetes: busca, cuenta por estado, cambia el estado de uno o de varios y exporta a CSV. */
export function PackageList() {
  const t = useT();
  const notify = useNotify();
  const format = useFormat();
  const api = useCrud<Package, PackageInput>('packages');
  const { ask, dialog } = useConfirm();
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const domain = useMasterDomain('PackageStatus').active;
  const inUse = t('No se puede eliminar: el paquete está incluido en una jornada');
  /** Estados activos del dominio `PackageStatus` del gateway (el gateway rechaza los inactivos) o, si aún no hay, los habituales. */
  const statuses = domain.length > 0 ? domain.map((v) => v.key) : DEFAULT_PACKAGE_STATUSES;

  const columns = useMemo<Column<Package>[]>(
    () => [
      { id: 'guideNumber', header: t('Guía'), cell: (p) => p.guideNumber ?? '', kind: 'id' },
      { id: 'name', header: t('Nombre'), cell: (p) => p.name, primary: true, kind: 'strong' },
      { id: 'address', header: t('Dirección'), cell: (p) => p.address, kind: 'muted' },
      { id: 'serviceType', header: t('Servicio'), cell: (p) => serviceTypeLabel(p.serviceType, t) },
      {
        id: 'status',
        header: t('Estado'),
        cell: (p) => packageStatusLabel(p.status, t),
        tone: (p) => statusTone('package', p.status),
      },
      { id: 'updatedAt', header: t('Actualizado'), cell: (p) => format.relativeTime(p.updatedAt), kind: 'muted' },
    ],
    [t, format]
  );

  const facet = useCallback(
    (rows: readonly Package[]): Facet<Package> => ({
      label: t('Estado'),
      of: (p) => p.status,
      options: packageStatusOrder(rows).map((key) => ({ key, label: packageStatusLabel(key, t) })),
    }),
    [t]
  );

  /** Cancelar pide confirmación antes (una sola para todos): si se rechaza, no se llama al gateway. */
  async function changeMany(rows: readonly Package[], status: string, clear?: () => void) {
    setError(null);
    if (status === 'cancelled') {
      const ok = await ask({
        title: t('Cancelar paquetes'),
        message:
          rows.length === 1
            ? t('¿Cancelar el paquete «{0}»?', [packageLabel(rows[0]!)])
            : t('¿Cancelar los {0} paquetes elegidos?', [rows.length]),
        confirmLabel: rows.length === 1 ? t('Cancelar paquete') : t('Cancelar paquetes'),
        danger: true,
      });
      if (!ok) return;
    }
    const result = await runBulk(
      rows,
      packageLabel,
      (row) => setPackageStatus(row.id, status, t),
      t('No se pudo completar la solicitud')
    );
    const statusName = packageStatusLabel(status, t);
    if (result.done > 0) {
      notify(
        result.done === 1 && rows.length === 1
          ? t('El paquete «{0}» ahora está {1}', [packageLabel(rows[0]!), statusName.toLowerCase()])
          : result.done === 1
            ? t('El estado de 1 paquete ahora es «{0}»', [statusName])
            : t('El estado de {0} paquetes ahora es «{1}»', [result.done, statusName])
      );
    }
    if (result.failed.length > 0) {
      setError(
        t('No se pudo cambiar el estado de {0}: {1}', [
          result.failed.length === 1 ? t('1 paquete') : t('{0} paquetes', [result.failed.length]),
          result.failed.map((f) => `«${f.label}» (${f.message})`).join('; '),
        ])
      );
    }
    clear?.();
    setVersion((v) => v + 1);
  }

  const menu = (rows: readonly Package[], clear?: () => void, current?: string) => (
    <DropdownMenuContent align="end">
      {statuses
        .filter((status) => status !== current)
        .map((status) => (
          <DropdownMenuItem key={status} onSelect={() => void changeMany(rows, status, clear)}>
            {packageStatusLabel(status, t)}
          </DropdownMenuItem>
        ))}
    </DropdownMenuContent>
  );

  return (
    <>
      <EntityList<Package>
        key={version}
        title={t('Paquetes')}
        singular={t('paquete')}
        plural={t('paquetes')}
        fetchPage={api.list}
        above={
          error ? (
            <p
              role="alert"
              className="mb-3 rounded-control bg-error-container px-4 py-3 text-sm text-on-error-container"
            >
              {error}
            </p>
          ) : null
        }
        columns={columns}
        facet={facet}
        headActions={
          <Link href="/packages/import" className={buttonVariants({ variant: 'outlined' })}>
            <Icon icon={RiFileUploadLine} size={20} />
            {t('Importar CSV')}
          </Link>
        }
        newHref="/packages/new"
        newLabel={t('Nuevo paquete')}
        emptyMessage={t('Todavía no hay paquetes')}
        emptyActionLabel={t('Crear el primer paquete')}
        emptyExtra={
          <Link href="/packages/import" className={buttonVariants({ variant: 'outlined' })}>
            {t('Importar un CSV')}
          </Link>
        }
        searchPlaceholder={t('Buscar por guía, nombre o dirección')}
        rowLabel={packageLabel}
        editHref={(p) => `/packages/${encodeURIComponent(p.id)}`}
        editLabel={(p) => t('Editar paquete ') + packageLabel(p)}
        remove={(p, messages) => api.remove(p.id, messages)}
        byStatus={{ 400: inUse, 409: inUse }}
        fileBase="paquetes"
        csv={(rows) => packagesToCsv(rows, t)}
        extraActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton icon={RiLoopLeftLine} label={t('Cambiar el estado del paquete ') + packageLabel(row)} />
            </DropdownMenuTrigger>
            {menu([row], undefined, row.status)}
          </DropdownMenu>
        )}
        selectionExtra={(rows, clear) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="text">
                <Icon icon={RiLoopLeftLine} size={20} />
                {t('Cambiar estado')}
              </Button>
            </DropdownMenuTrigger>
            {menu(rows, clear)}
          </DropdownMenu>
        )}
      />
      {dialog}
    </>
  );
}
