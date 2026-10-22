import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { EMPTY, Subscription, of, switchMap } from 'rxjs';

import { MasterDomainsService } from '../../core/api/data/master-domains.service';
import { PackagesApi } from '../../core/api/data/packages.api';
import { Package } from '../../core/api/models';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { messageFor } from '../../shared/data/api-messages';
import { downloadCsv } from '../../shared/data/csv';
import { DataColumn, DataTableComponent } from '../../shared/data/data-table.component';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { ListState } from '../../shared/data/list-state';
import { PageHeaderComponent } from '../../shared/data/page-header.component';
import { FormResultComponent } from '../../shared/form/form-result.component';

import { EXPORT_FILE_NAME, ExportProgress, fetchAllPackages, packagesToCsv } from './package-export';
import {
  DEFAULT_PACKAGE_STATUSES,
  formatPackageLocation,
  packageStatusLabel,
  serviceTypeLabel,
} from './package-labels';

const IN_USE = 'No se puede eliminar: el paquete está incluido en una jornada';

@Component({
  selector: 'app-package-list',
  imports: [DataTableComponent, PageHeaderComponent, FormResultComponent, MatButtonModule, MatIconModule, MatMenuModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Paquetes">
      <button mat-stroked-button type="button" (click)="exportCsv()" [disabled]="exporting() || state.total() === 0">
        <mat-icon aria-hidden="true">download</mat-icon>Exportar CSV
      </button>
      <a mat-flat-button routerLink="/paquetes/nuevo"><mat-icon aria-hidden="true">add</mat-icon>Nuevo paquete</a>
    </app-page-header>
    @if (exporting()) {
      <p role="status">Exportando… {{ progress().loaded }} de {{ progress().total }}</p>
    }
    <app-form-result [error]="deleter.error()" [success]="deleter.success()" />
    <app-data-table [state]="state" [columns]="columns" entityPlural="paquetes" emptyMessage="Todavía no hay paquetes">
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
      <a empty-action mat-stroked-button routerLink="/paquetes/nuevo">Crear el primer paquete</a>
    </app-data-table>

    <mat-menu #statusMenu="matMenu">
      <ng-template matMenuContent let-row="row">
        @for (status of statusesExcept(row.status); track status) {
          <button mat-menu-item type="button" (click)="changeStatus(row, status)">{{ statusLabel(status) }}</button>
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
  private exportSubscription: Subscription | null = null;

  protected readonly exporting = signal(false);
  protected readonly progress = signal<ExportProgress>({ loaded: 0, total: 0 });

  protected readonly deleter = new DeleteFlow();
  protected readonly state = new ListState<Package>((params) => this.api.list(params));
  protected readonly statusLabel = packageStatusLabel;

  /** Estados del dominio `PackageStatus` del gateway o, si aún no hay, los habituales. */
  private readonly statuses = computed(() => {
    const values = this.masters.values('PackageStatus');
    return values.length ? values.map((v) => v.key) : DEFAULT_PACKAGE_STATUSES;
  });

  protected readonly columns: DataColumn<Package>[] = [
    { id: 'guideNumber', header: 'Guía', cell: (p) => p.guideNumber ?? '' },
    { id: 'name', header: 'Nombre', cell: (p) => p.name },
    { id: 'serviceType', header: 'Servicio', cell: (p) => serviceTypeLabel(p.serviceType) },
    { id: 'address', header: 'Dirección', cell: (p) => p.address },
    { id: 'status', header: 'Estado', cell: (p) => packageStatusLabel(p.status) },
    { id: 'location', header: 'Latitud / longitud', cell: (p) => formatPackageLocation(p) },
  ];

  constructor() {
    this.masters.load().subscribe({ error: () => undefined });
    this.state.load(0);
    // Si se sale de la pantalla a mitad de una exportación, se cortan las peticiones
    inject(DestroyRef).onDestroy(() => this.exportSubscription?.unsubscribe());
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
    const confirmed$ =
      status === 'cancelled'
        ? this.dialog
            .open(ConfirmDialogComponent, {
              data: {
                title: 'Cancelar paquete',
                message: `¿Cancelar el paquete «${this.label(row)}»?`,
                confirmLabel: 'Cancelar paquete',
                cancelLabel: 'Volver',
              },
            })
            .afterClosed()
            .pipe(switchMap((ok) => (ok === true ? of(true) : EMPTY)))
        : of(true);

    confirmed$.pipe(switchMap(() => this.api.setStatus(row.id, status))).subscribe({
      next: () => {
        this.deleter.success.set(`El paquete «${this.label(row)}» ahora está ${packageStatusLabel(status).toLowerCase()}`);
        this.state.reload();
      },
      error: (err: unknown) => this.deleter.error.set(messageFor(err)),
    });
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
