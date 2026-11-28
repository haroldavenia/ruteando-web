'use client';

import { useMemo } from 'react';

import { DataTable } from '@/components/data/data-table';
import { PageHead } from '@/components/page/page-head';
import { arrayPage } from '@/lib/api/array-page';
import type { MasterDomain } from '@/lib/api/models';
import { getData } from '@/lib/api-client';
import { valuesText } from '@/lib/catalogs/values';
import { useFormat } from '@/lib/hooks/use-format';
import { useT } from '@/lib/i18n/client';
import type { Column } from '@/lib/list/list-logic';
import { useFullList } from '@/lib/list/use-full-list';

/** Catálogos del gateway (`master-domains`): las listas de valores de las que se llenan los selectores de la aplicación. */
export function CatalogList() {
  const t = useT();
  const format = useFormat();
  const fetchPage = useMemo(() => arrayPage(() => getData<MasterDomain[]>('master-domains', t)), [t]);
  const list = useFullList(fetchPage);

  const columns = useMemo<Column<MasterDomain>[]>(
    () => [
      {
        id: 'code',
        header: t('Código'),
        cell: (d) => d.code,
        kind: 'strong',
        primary: true,
        link: (d) => `/catalogs/${encodeURIComponent(d.code)}`,
      },
      { id: 'description', header: t('Descripción'), cell: (d) => d.description },
      { id: 'type', header: t('Tipo'), cell: (d) => (d.system ? t('Del sistema') : t('Propio')), kind: 'muted' },
      { id: 'values', header: t('Valores activos'), cell: (d) => valuesText(d, (a, b) => t('{0} de {1}', [a, b])) },
    ],
    [t]
  );

  return (
    <>
      <PageHead
        title={t('Catálogos')}
        subtitle={
          list.status !== 'ready'
            ? undefined
            : list.total === 1
              ? t('1 catálogo')
              : t('{0} catálogos', [format.count(list.total)])
        }
      />
      <DataTable<MasterDomain>
        list={list}
        columns={columns}
        rowKey={(d) => d.code}
        entityPlural={t('catálogos')}
        emptyMessage={t('Todavía no hay catálogos')}
        searchPlaceholder={t('Buscar por código o descripción')}
      />
    </>
  );
}
