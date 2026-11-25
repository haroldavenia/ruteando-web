import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';

import { fromGeoJsonPoint } from '../../../core/geo/lat-lng';
import { t } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { downloadCsv } from '../../../shared/data/csv';
import { DataColumn, DataFacet, DataTableComponent } from '../../../shared/data/data-table.component';
import { LocalListState } from '../../../shared/data/local-list-state';
import { formatLatLng } from '../../../shared/format';
import { ActionTitleDirective } from '../../../shared/ui/action-title.directive';
import { statusTone } from '../../../shared/ui/status-tone';
import { geocodingStatusLabel } from '../package-labels';
import { LocationFixDialogComponent } from './location-fix-dialog.component';
import {
  importableRows,
  needsLocating,
  REVIEW_FILE_NAME,
  reviewCounts,
  reviewCsv,
  ReviewRow,
} from './package-locating';

/** Chips de estado, en plural como en la app anterior («Ubicadas (12)»). */
const FACET_OPTIONS: readonly { key: string; label: string }[] = [
  { key: 'match', label: t('Ubicadas') },
  { key: 'mean', label: t('Aproximadas') },
  { key: 'manual', label: t('Manuales') },
  { key: 'unmatch', label: t('No ubicadas') },
];

/**
 * Revisión de las ubicaciones de las filas del archivo antes de crear los paquetes (la pantalla «itinerario» de la app
 * anterior): las filas con su estado (ubicada, aproximada, manual o no ubicada), corregir una colocándola en el mapa o
 * cambiando su dirección, quitar las que sobran y descargar el resultado. Las que no tienen ubicación no se importan.
 */
@Component({
  selector: 'app-package-location-review',
  imports: [ActionTitleDirective, DataTableComponent, MatButtonModule, MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './package-location-review.component.html',
  styleUrl: './package-location-review.component.scss',
})
export class PackageLocationReviewComponent {
  private readonly dialog = inject(MatDialog);
  private readonly platformId = inject(PLATFORM_ID);

  readonly rows = model.required<ReviewRow[]>();
  /** La persona confirma: se crean los paquetes con ubicación. */
  readonly confirm = output<void>();
  /** La persona pide volver a intentar ubicar las filas que fallaron por un error del servicio. */
  readonly retry = output<void>();

  protected readonly state = new LocalListState<ReviewRow>();
  protected readonly counts = computed(() => reviewCounts(this.rows()));
  protected readonly importCount = computed(() => importableRows(this.rows()).length);
  protected readonly skipped = computed(() => this.rows().filter(needsLocating).length);

  protected readonly facet: DataFacet<ReviewRow> = {
    label: t('Estado'),
    of: (row) => row.status,
    options: FACET_OPTIONS,
  };

  protected readonly columns: DataColumn<ReviewRow>[] = [
    { id: 'line', header: t('Línea'), cell: (row) => String(row.line), kind: 'id', primary: true },
    { id: 'address', header: t('Dirección'), cell: (row) => row.input.address, kind: 'strong' },
    { id: 'city', header: t('Ciudad'), cell: (row) => row.input.city ?? '', kind: 'muted' },
    {
      id: 'standardized',
      header: t('Dirección estandarizada'),
      cell: (row) => row.standardizedAddress ?? '',
      kind: 'muted',
    },
    {
      id: 'location',
      header: t('Latitud / longitud'),
      cell: (row) => (row.input.location ? formatLatLng(fromGeoJsonPoint(row.input.location.coordinates)) : ''),
      kind: 'muted',
    },
    {
      id: 'status',
      header: t('Estado'),
      cell: (row) => this.statusText(row),
      tone: (row) => (row.failed ? 'warning' : statusTone('geocoding', row.status)),
    },
  ];

  protected readonly key = (row: ReviewRow): string => String(row.line);

  constructor() {
    effect(() => this.state.set(this.rows()));
  }

  /** «Ubicada»… o, si el servicio falló con esta fila, que se pudo ubicar pero no se pudo consultar. */
  protected statusText(row: ReviewRow): string {
    return row.failed ? t('Sin respuesta del servicio') : geocodingStatusLabel(row.status);
  }

  protected fix(row: ReviewRow): void {
    this.dialog
      .open<LocationFixDialogComponent, ReviewRow, ReviewRow>(LocationFixDialogComponent, {
        data: row,
        width: '900px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(filter((updated): updated is ReviewRow => !!updated))
      .subscribe((updated) => this.rows.update((all) => all.map((r) => (r.line === updated.line ? updated : r))));
  }

  protected lineNumbers(rows: readonly ReviewRow[]): number[] {
    return rows.map((row) => row.line);
  }

  protected remove(lines: readonly number[]): void {
    this.rows.update((all) => all.filter((r) => !lines.includes(r.line)));
  }

  protected download(): void {
    downloadCsv(REVIEW_FILE_NAME, reviewCsv(this.rows()), this.platformId);
  }
}
