import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { MasterDomainsService } from '../../core/api/data/master-domains.service';
import { PackagesApi } from '../../core/api/data/packages.api';
import { Package } from '../../core/api/models';
import { formatRelativeTime } from '../../shared/format';
import { messageFor } from '../../shared/data/api-messages';
import { downloadCsv } from '../../shared/data/csv';
import { DataColumn, DataFacet, DataTableComponent } from '../../shared/data/data-table.component';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { FullListState } from '../../shared/data/full-list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { statusTone } from '../../shared/ui/status-tone';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';

import { changeStatusOfMany } from './package-bulk-status';
import { EXPORT_FILE_NAME, ExportProgress, fetchAllPackages, packagesToCsv } from './package-export';
import {
  DEFAULT_PACKAGE_STATUSES,
  PACKAGE_STATUS_LABELS,
  packageStatusLabel,
  serviceTypeLabel,
} from './package-labels';
import { changePackageStatus } from './package-status-change';

const IN_USE = 'No se puede eliminar: el paquete está incluido en una jornada';

@Component({
  selector: 'app-package-list',
  imports: [DataTableComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, MatMenuModule, RouterLink, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .empty-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }
  `,
  template: `
    <app-page-header title="Paquetes" [subtitle]="state.countText('paquete', 'paquetes')">
      <a mat-stroked-button routerLink="/paquetes/importar"><mat-icon aria-hidden="true">upload_file</mat-icon>Importar CSV</a>
      <button mat-stroked-button type="button" (click)="exportCsv()" [disabled]="exporting() || state.total() === 0">
        <mat-icon aria-hidden="true">download</mat-icon>Exportar CSV
      </button>
      <a mat-flat-button class="primary-action" routerLink="/paquetes/nuevo"><mat-icon aria-hidden="true">add</mat-icon>Nuevo paquete</a>
    </app-page-header>
    @if (exporting()) {
      <p role="status">Exportando… {{ progress().loaded }} de {{ progress().total }}</p>
    }
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table
      [state]="state"
      [columns]="columns"
      [facet]="facet()"
      [selectable]="true"
      entityPlural="paquetes"
      emptyMessage="Todavía no hay paquetes"
      searchPlaceholder="Buscar por guía, nombre o dirección"
    >
      <ng-template #rowActions let-row>
        <a mat-icon-button [routerLink]="['/paquetes', row.id]" [attr.aria-label]="'Editar paquete ' + label(row)">
          <mat-icon aria-hidden="true">edit</mat-icon>
        </a>
        <button
          mat-icon-button
          type="button"
          [matMenuTriggerFor]="statusMenu"
          [matMenuTriggerData]="{ row: row }"
          [attr.aria-label]="'Cambiar el estado del paquete ' + label(row)"
        >
          <mat-icon aria-hidden="true">published_with_changes</mat-icon>
        </button>
        <button mat-icon-button type="button" (click)="remove(row)" [attr.aria-label]="'Eliminar paquete ' + label(row)">
          <mat-icon aria-hidden="true">delete</mat-icon>
        </button>
      </ng-template>
      <ng-template #selectionActions let-rows let-clear="clear">
        <button mat-button type="button" [matMenuTriggerFor]="bulkMenu" [matMenuTriggerData]="{ rows: rows, clear: clear }">
          <mat-icon aria-hidden="true">published_with_changes</mat-icon>Cambiar estado
        </button>
        <button mat-button type="button" (click)="exportSelected(rows)"><mat-icon aria-hidden="true">download</mat-icon>Exportar</button>
      </ng-template>
      <span empty-action class="empty-actions">
        <a mat-stroked-button routerLink="/paquetes/nuevo">Crear el primer paquete</a>
        <a mat-stroked-button routerLink="/paquetes/importar">Importar un CSV</a>
      </span>
    </app-data-table>

    <mat-menu #statusMenu="matMenu">
      <ng-template matMenuContent let-row="row">
        @for (status of statusesExcept(row.status); track status) {
          <button mat-menu-item type="button" (click)="changeStatus(row, status)">{{ statusLabel(status) }}</button>
        }
      </ng-template>
    </mat-menu>

    <mat-menu #bulkMenu="matMenu">
      <ng-template matMenuContent let-rows="rows" let-clear="clear">
        @for (status of statuses(); track status) {
          <button mat-menu-item type="button" (click)="changeMany(rows, status, clear)">{{ statusLabel(status) }}</button>
        }
      </ng-template>
    </mat-menu>
  `,
})
export class PackageListComponent {
  private readonly api = inject(PackagesApi);
  private readonly dialog = inject(MatDialog);
  private readonly masters = inject(MasterDomainsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private exportSubscription: Subscription | null = null;

  protected readonly exporting = signal(false);
  protected readonly progress = signal<ExportProgress>({ loaded: 0, total: 0 });

  protected readonly deleter = new DeleteFlow();
  /** Todos los paquetes en el cliente (hasta 1000): el gateway no filtra por estado, así que los chips y la búsqueda necesitan tenerlos todos. */
  protected readonly state = new FullListState<Package>((params) => this.api.list(params));
  protected readonly statusLabel = packageStatusLabel;

  /** Estados activos del dominio `PackageStatus` del gateway (el gateway rechaza los inactivos) o, si aún no hay, los habituales. */
  protected readonly statuses = computed(() => {
    const values = this.masters.activeValues('PackageStatus');
    return values.length ? values.map((v) => v.key) : DEFAULT_PACKAGE_STATUSES;
  });

  /** Chips de estado: los que conoce la aplicación, en su orden, y al final cualquier estado desconocido que traigan los paquetes. */
  protected readonly facet = computed<DataFacet<Package>>(() => {
    const known = Object.keys(PACKAGE_STATUS_LABELS);
    const unknown = [...new Set(this.state.rows().map((p) => p.status))].filter((key) => !known.includes(key));
    return { label: 'Estado', of: (p) => p.status, options: [...known, ...unknown].map((key) => ({ key, label: packageStatusLabel(key) })) };
  });

  protected readonly columns: DataColumn<Package>[] = [
    { id: 'guideNumber', header: 'Guía', cell: (p) => p.guideNumber ?? '', kind: 'id' },
    { id: 'name', header: 'Nombre', cell: (p) => p.name, primary: true, kind: 'strong' },
    { id: 'address', header: 'Dirección', cell: (p) => p.address, kind: 'muted' },
    { id: 'serviceType', header: 'Servicio', cell: (p) => serviceTypeLabel(p.serviceType) },
    { id: 'status', header: 'Estado', cell: (p) => packageStatusLabel(p.status), tone: (p) => statusTone('package', p.status) },
    { id: 'updatedAt', header: 'Actualizado', cell: (p) => formatRelativeTime(p.updatedAt), kind: 'muted' },
  ];

  constructor() {
    this.masters.load().subscribe({ error: () => undefined });
    this.state.load();
    // Si se sale de la pantalla a mitad de una exportación, se cortan las peticiones
    this.destroyRef.onDestroy(() => this.exportSubscription?.unsubscribe());
  }

  /** Cómo se nombra el paquete en etiquetas y avisos: su guía o, si no tiene, su nombre. */
  protected label(row: Package): string {
    return row.guideNumber?.trim() || row.name;
  }

  protected statusesExcept(current: string): string[] {
    return this.statuses().filter((status) => status !== current);
  }

  protected remove(row: Package): void {
    this.deleter.run({
      entity: 'paquete',
      name: this.label(row),
      request: () => this.api.remove(row.id),
      byStatus: { 400: IN_USE, 409: IN_USE },
      reload: () => this.state.reload(),
    });
  }

  protected changeStatus(row: Package, status: string): void {
    this.deleter.success.set(null);
    this.deleter.error.set(null);
    changePackageStatus(this.api, this.dialog, { id: row.id, label: this.label(row) }, status).subscribe({
      next: () => {
        this.deleter.success.set(`El paquete «${this.label(row)}» ahora está ${packageStatusLabel(status).toLowerCase()}`);
        this.state.reload();
      },
      error: (err: unknown) => this.deleter.error.set(messageFor(err)),
    });
  }

  /** Cambia el estado de los paquetes elegidos, uno por petición: los que el gateway rechace se cuentan y se nombran. */
  protected changeMany(rows: readonly Package[], status: string, clear: () => void): void {
    this.deleter.success.set(null);
    this.deleter.error.set(null);
    changeStatusOfMany(this.api, this.dialog, rows.map((row) => ({ id: row.id, label: this.label(row) })), status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ changed, failed }) => {
          if (changed > 0) {
            this.deleter.success.set(
              `${changed === 1 ? 'El estado de 1 paquete' : `El estado de ${changed} paquetes`} ahora es «${packageStatusLabel(status)}»`,
            );
          }
          if (failed.length > 0) {
            this.deleter.error.set(
              `No se pudo cambiar el estado de ${failed.length === 1 ? '1 paquete' : `${failed.length} paquetes`}: ${failed.map((f) => `«${f.label}» (${f.message})`).join('; ')}`,
            );
          }
          clear();
          this.state.reload();
        },
        error: (err: unknown) => this.deleter.error.set(messageFor(err)),
      });
  }

  /** Descarga en un CSV solo los paquetes elegidos (ya están cargados: no hace falta pedirlos otra vez). */
  protected exportSelected(rows: readonly Package[]): void {
    this.deleter.error.set(null);
    downloadCsv(EXPORT_FILE_NAME, packagesToCsv(rows), this.platformId);
    this.deleter.success.set(`Se exportaron ${rows.length === 1 ? '1 paquete elegido' : `${rows.length} paquetes elegidos`} a ${EXPORT_FILE_NAME}`);
  }

  /** Descarga todos los paquetes en un CSV; ante un fallo no se descarga nada y se puede reintentar. */
  protected exportCsv(): void {
    this.deleter.success.set(null);
    this.deleter.error.set(null);
    this.exporting.set(true);
    this.progress.set({ loaded: 0, total: this.state.total() });
    this.exportSubscription = fetchAllPackages(
      (page, size) => this.api.list({ page, size }),
      (progress) => this.progress.set(progress),
    ).subscribe({
      next: (items) => {
        downloadCsv(EXPORT_FILE_NAME, packagesToCsv(items), this.platformId);
        this.deleter.success.set(`Se exportaron ${items.length} paquetes a ${EXPORT_FILE_NAME}`);
        this.exporting.set(false);
      },
      error: (err: unknown) => {
        this.deleter.error.set(`No se pudo exportar: ${messageFor(err)}. Puedes volver a intentarlo.`);
        this.exporting.set(false);
      },
    });
  }
}
