import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subscription } from 'rxjs';

import { PackagesApi } from '../../core/api/data/packages.api';
import { Package } from '../../core/api/models';
import { messageFor } from '../../shared/data/api-messages';
import { DataColumn, DataTableComponent } from '../../shared/data/data-table.component';
import { ListState } from '../../shared/data/list-state';
import { fetchAllPackages } from '../packages/package-export';
import { formatPackageLocation, packageStatusLabel, serviceTypeLabel } from '../packages/package-labels';

import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
const PENDING = 'pending';

/**
 * Tabla paginada para elegir los paquetes de una jornada. La selección (`selectedIds`) vive fuera de la
 * página: cambiar de página, filtrar o recargar no la pierde. «Seleccionar todos los pendientes» pide
 * todas las páginas y suma a la selección los paquetes en estado `pending`.
 */
@Component({
  selector: 'app-package-picker',
  imports: [DataTableComponent, MatButtonModule, MatCheckboxModule, MatProgressBarModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <button mat-stroked-button type="button" (click)="selectAllPending()" [disabled]="loadingAll()">
        {{ 'Seleccionar todos los pendientes' | t }}
      </button>
      <button mat-button type="button" (click)="clear()" [disabled]="selectedIds().length === 0">
        {{ 'Quitar la selección' | t }}
      </button>
      <span class="total" role="status">{{ totalText() }}</span>
    </div>
    @if (loadingAll()) {
      <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Buscando los paquetes pendientes' | t" />
      <p role="status">{{ 'Buscando paquetes pendientes… {0}' | t: [progress()] }}</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    <app-data-table
      [state]="state"
      [columns]="columns"
      [entityPlural]="'paquetes' | t"
      [emptyMessage]="'Todavía no hay paquetes' | t"
    >
      <ng-template #rowActions let-row>
        <mat-checkbox
          [checked]="isSelected(row.id)"
          (change)="toggle(row.id, $event.checked)"
          [aria-label]="('Seleccionar paquete ' | t) + label(row)"
        >
          <span class="stack-only">{{ 'Seleccionar' | t }}</span>
        </mat-checkbox>
      </ng-template>
    </app-data-table>
  `,
  styles: `
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
      margin-bottom: 8px;
    }
    .total {
      font: var(--mat-sys-title-small);
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class PackagePickerComponent {
  private readonly api = inject(PackagesApi);
  private fetchSubscription: Subscription | null = null;

  /** Identificadores elegidos; se enlaza con `[(selectedIds)]`. */
  readonly selectedIds = model<string[]>([]);

  protected readonly state = new ListState<Package>((params) => this.api.list(params));
  /** `true` cuando el tenant no tiene ningún paquete. */
  readonly isEmpty = computed(() => this.state.status() === 'empty');
  protected readonly loadingAll = signal(false);
  protected readonly progress = signal('');
  protected readonly error = signal<string | null>(null);

  private readonly selectedSet = computed(() => new Set(this.selectedIds()));
  protected readonly totalText = computed(() => {
    const total = this.selectedIds().length;
    return total === 0
      ? t('Ningún paquete seleccionado')
      : total === 1
        ? t('1 paquete seleccionado')
        : t('{0} paquetes seleccionados', [total]);
  });

  protected readonly columns: DataColumn<Package>[] = [
    { id: 'guideNumber', header: t('Guía'), cell: (p) => p.guideNumber ?? '' },
    { id: 'name', header: t('Nombre'), primary: true, cell: (p) => p.name },
    { id: 'serviceType', header: t('Servicio'), cell: (p) => serviceTypeLabel(p.serviceType) },
    { id: 'address', header: t('Dirección'), cell: (p) => p.address },
    { id: 'status', header: t('Estado'), cell: (p) => packageStatusLabel(p.status) },
    { id: 'location', header: t('Latitud / longitud'), cell: (p) => formatPackageLocation(p) },
  ];

  constructor() {
    this.state.load(0);
    inject(DestroyRef).onDestroy(() => this.fetchSubscription?.unsubscribe());
  }

  protected label(row: Package): string {
    return row.guideNumber?.trim() || row.name;
  }

  protected isSelected(id: string): boolean {
    return this.selectedSet().has(id);
  }

  protected toggle(id: string, checked: boolean): void {
    const next = new Set(this.selectedSet());
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectedIds.set([...next]);
  }

  protected clear(): void {
    this.selectedIds.set([]);
  }

  protected selectAllPending(): void {
    this.error.set(null);
    this.loadingAll.set(true);
    this.progress.set('');
    this.fetchSubscription?.unsubscribe();
    this.fetchSubscription = fetchAllPackages(
      (page, size) => this.api.list({ page, size }),
      ({ loaded, total }) => this.progress.set(t('{0} de {1}', [loaded, total]))
    ).subscribe({
      next: (items) => {
        const next = new Set(this.selectedSet());
        items.filter((item) => item.status === PENDING).forEach((item) => next.add(item.id));
        this.selectedIds.set([...next]);
        this.loadingAll.set(false);
      },
      error: (err: unknown) => {
        this.error.set(t('No se pudieron cargar todos los paquetes: {0}', [messageFor(err)]));
        this.loadingAll.set(false);
      },
    });
  }
}
