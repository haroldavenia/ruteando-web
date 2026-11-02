import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { SettingsApi } from '../../core/api/data/settings.api';
import { Settings } from '../../core/api/models';
import { DataColumn, DataTableComponent } from '../../shared/data/data-table.component';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { ListState } from '../../shared/data/list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

import { restrictionTypeLabel, routeTopologyLabel } from './settings-labels';

import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
const IN_USE = t('No se puede eliminar: la configuración se usa en una jornada');

@Component({
  selector: 'app-settings-list',
  imports: [DataTableComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, RouterLink, ActionTitleDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="'Configuraciones' | t" [subtitle]="state.countText('configuración', 'configuraciones')">
      <a mat-flat-button class="primary-action" routerLink="/configuraciones/nuevo"><mat-icon aria-hidden="true">add</mat-icon>{{ 'Nueva configuración' | t }}</a>
    </app-page-header>
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table [state]="state" [columns]="columns" [entityPlural]="'configuraciones' | t" [emptyMessage]="'Todavía no hay configuraciones' | t">
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/configuraciones', row.id]" [attr.aria-label]="('Editar configuración ' | t) + row.description">
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="('Eliminar configuración ' | t) + row.description">
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <a empty-action mat-stroked-button routerLink="/configuraciones/nuevo">{{ 'Crear la primera configuración' | t }}</a>
    </app-data-table>
  `,
})
export class SettingsListComponent {
  private readonly api = inject(SettingsApi);

  protected readonly deleter = new DeleteFlow();
  protected readonly state = new ListState<Settings>((params) => this.api.list(params));
  protected readonly columns: DataColumn<Settings>[] = [
    { id: 'description', header: t('Descripción'), cell: (s) => s.description, kind: 'strong' },
    { id: 'routeTopology', header: t('Topología'), cell: (s) => routeTopologyLabel(s.routeTopology) },
    { id: 'restrictionType', header: t('Restricción'), cell: (s) => restrictionTypeLabel(s.restrictionType) },
    { id: 'placeStart', header: t('Salida'), cell: (s) => s.placeStart?.name ?? '' },
    { id: 'resources', header: t('Vehículos'), cell: (s) => String(s.resourceIds?.length ?? 0) },
    { id: 'active', header: t('Estado'), cell: (s) => (s.active ? t('Activa') : t('Inactiva')) },
  ];

  constructor() {
    this.state.load(0);
  }

  protected remove(row: Settings): void {
    this.deleter.run({
      entity: t('configuración'),
      name: row.description,
      request: () => this.api.remove(row.id),
      byStatus: { 400: IN_USE, 409: IN_USE },
      reload: () => this.state.reload(),
    });
  }
}
