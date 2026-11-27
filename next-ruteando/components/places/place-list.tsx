'use client';

import { RiCloseLine } from '@remixicon/react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { PlacesMap } from '@/components/map/places-map';
import { EntityList } from '@/components/page/entity-list';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import type { Place, PlaceInput } from '@/lib/api/models';
import { useCrud } from '@/lib/hooks/use-crud';
import { useLang, useT } from '@/lib/i18n/client';
import type { Column, Facet } from '@/lib/list/list-logic';
import { formatLocation, placeTypeLabel, placeTypeOrder } from '@/lib/places/labels';

/** Listado de lugares con su mapa (un pin por lugar filtrado) y la ficha del lugar elegido en el mapa. */
export function PlaceList() {
  const t = useT();
  const lang = useLang();
  const api = useCrud<Place, PlaceInput>('places');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inUse = t('No se puede eliminar: el lugar está en uso');

  const columns = useMemo<Column<Place>[]>(
    () => [
      { id: 'name', header: t('Nombre'), cell: (p) => p.name, kind: 'strong', primary: true },
      { id: 'type', header: t('Tipo'), cell: (p) => placeTypeLabel(p.type, t) },
      { id: 'address', header: t('Dirección'), cell: (p) => p.address ?? '', kind: 'muted' },
      { id: 'phoneNumber', header: t('Teléfono'), cell: (p) => p.phoneNumber ?? '', kind: 'muted' },
      { id: 'location', header: t('Latitud / longitud'), cell: (p) => formatLocation(p, lang), kind: 'muted' },
    ],
    [t, lang]
  );

  /** Chips de tipo: los que conoce la aplicación, en su orden, y al final cualquier tipo desconocido que traigan los lugares. */
  const facet = useCallback(
    (rows: readonly Place[]): Facet<Place> => ({
      label: t('Tipo'),
      of: (p) => p.type,
      options: placeTypeOrder(rows).map((key) => ({ key, label: placeTypeLabel(key, t) })),
    }),
    [t]
  );

  return (
    <EntityList<Place>
      title={t('Lugares')}
      singular={t('lugar')}
      plural={t('lugares')}
      fetchPage={api.list}
      columns={columns}
      facet={facet}
      newHref="/places/new"
      newLabel={t('Nuevo lugar')}
      emptyMessage={t('Todavía no hay lugares')}
      emptyActionLabel={t('Crear el primer lugar')}
      searchPlaceholder={t('Buscar por nombre o dirección')}
      rowLabel={(p) => p.name}
      editHref={(p) => `/places/${encodeURIComponent(p.id)}`}
      editLabel={(p) => t('Editar lugar ') + p.name}
      remove={(p, messages) => api.remove(p.id, messages)}
      byStatus={{ 400: inUse, 409: inUse }}
      aside={({ rows, filtered }) => {
        const selected = rows.find((p) => p.id === selectedId) ?? null;
        return (
          <Card aria-labelledby="places-map-title">
            <CardTitle id="places-map-title" className="mb-3">
              {t('Mapa de los lugares')}
            </CardTitle>
            <PlacesMap places={filtered} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
            {selected ? (
              <div
                role="status"
                className="mt-3 flex items-center gap-3 rounded-control bg-secondary-container p-3 text-on-secondary-container"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate">{selected.name}</b>
                  <span className="truncate text-sm">
                    {placeTypeLabel(selected.type, t)}
                    {selected.address ? ` · ${selected.address}` : ''}
                  </span>
                </div>
                <Link
                  href={`/places/${encodeURIComponent(selected.id)}`}
                  aria-label={t('Editar lugar ') + selected.name}
                  className={buttonVariants({ variant: 'outlined' })}
                >
                  {t('Editar')}
                </Link>
                <IconButton
                  icon={RiCloseLine}
                  label={t('Cerrar la ficha del lugar')}
                  onClick={() => setSelectedId(null)}
                />
              </div>
            ) : null}
          </Card>
        );
      }}
    />
  );
}
