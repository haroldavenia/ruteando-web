import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { MasterDomainsApi } from '../../core/api/data/master-domains.api';
import { MasterDomain } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ClientPaging } from '../../shared/data/client-paging';
import { DataColumn, DataTableComponent } from '../../shared/data/data-table.component';
import { FullListState } from '../../shared/data/full-list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { formatCount } from '../../shared/format';

/** Valores activos sobre el total: «3 de 5». */
export const valuesText = (domain: MasterDomain): string =>
  t('{0} de {1}', [domain.values.filter((v) => v.active).length, domain.values.length]);

/** Catálogos del gateway (`master-domains`): las listas de valores de las que se llenan los selectores de la aplicación. */
@Component({
  selector: 'app-catalog-list',
  imports: [DataTableComponent, PageHeaderComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="'Catálogos' | t" [subtitle]="subtitle()" />
    <app-data-table
      [state]="state"
      [columns]="columns"
      [rowKey]="rowKey"
      [entityPlural]="'catálogos' | t"
      [emptyMessage]="'Todavía no hay catálogos' | t"
      [searchPlaceholder]="'Buscar por código o descripción' | t"
    />
  `,
})
export class CatalogListComponent {
  private readonly api = inject(MasterDomainsApi);
  private readonly paging = new ClientPaging<MasterDomain>(() => this.api.list());

  protected readonly state = new FullListState<MasterDomain>(this.paging.fetch);
  protected readonly subtitle = computed(() =>
    this.state.status() !== 'ready'
      ? null
      : this.state.total() === 1
        ? t('1 catálogo')
        : t('{0} catálogos', [formatCount(this.state.total())])
  );
  protected readonly rowKey = (domain: MasterDomain): string => domain.code;
  protected readonly columns: DataColumn<MasterDomain>[] = [
    { id: 'code', header: t('Código'), cell: (d) => d.code, kind: 'strong', link: (d) => ['/catalogs', d.code] },
    { id: 'description', header: t('Descripción'), cell: (d) => d.description },
    { id: 'type', header: t('Tipo'), cell: (d) => (d.system ? t('Del sistema') : t('Propio')), kind: 'muted' },
    { id: 'values', header: t('Valores activos'), cell: valuesText },
  ];

  constructor() {
    this.state.load();
  }
}
