import { ChangeDetectionStrategy, Component, effect, inject, model, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DestroyRef } from '@angular/core';

import { LatLng } from '../../core/geo/lat-lng';
import { ActionTitleDirective } from '../ui/action-title.directive';

type VertexGroup = FormGroup<{ lat: FormControl<number | null>; lng: FormControl<number | null> }>;

const group = (point?: LatLng): VertexGroup =>
  new FormGroup({
    lat: new FormControl<number | null>(point?.lat ?? null, [Validators.required, Validators.min(-90), Validators.max(90)]),
    lng: new FormControl<number | null>(point?.lng ?? null, [Validators.required, Validators.min(-180), Validators.max(180)]),
  });

const same = (a: readonly LatLng[], b: readonly LatLng[]): boolean => a.length === b.length && a.every((p, i) => p.lat === b[i].lat && p.lng === b[i].lng);

/**
 * Los vértices de un polígono en una tabla con latitud y longitud editables: es la alternativa completa
 * al mapa para quien no puede dibujar con el ratón. Un cambio válido actualiza `vertices`; con un valor
 * fuera de rango o vacío la lista no cambia y el error se ve junto al campo.
 */
@Component({
  selector: 'app-vertex-table',
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vertex-table.component.html',
  styleUrl: './vertex-table.component.scss',
})
export class VertexTableComponent {
  readonly vertices = model<LatLng[]>([]);

  protected readonly rows = new FormArray<VertexGroup>([]);

  constructor() {
    // Cambios que llegan desde fuera (el mapa): se reconstruye la tabla si no coincide con lo que hay
    effect(() => {
      const incoming = this.vertices();
      untracked(() => {
        if (!same(this.validPoints(), incoming) || this.rows.length !== incoming.length) {
          this.rows.clear({ emitEvent: false });
          incoming.forEach((p) => this.rows.push(group(p), { emitEvent: false }));
        }
      });
    });
    this.rows.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.publish());
  }

  /** Puntos de las filas, o `null` en la posición de una fila vacía o fuera de rango. */
  private validPoints(): LatLng[] {
    return this.rows.controls.flatMap((row) => (row.valid ? [{ lat: row.controls.lat.value as number, lng: row.controls.lng.value as number }] : []));
  }

  private publish(): void {
    if (this.rows.controls.every((row) => row.valid)) {
      const next = this.validPoints();
      if (!same(next, this.vertices())) {
        this.vertices.set(next);
      }
    }
  }

  protected add(): void {
    const current = this.vertices();
    const first = current[0];
    const last = current[current.length - 1];
    // El vértice nuevo nace a medio camino entre el último y el primero, para que se vea y siga siendo válido
    const point = first && last ? { lat: (first.lat + last.lat) / 2 + (current.length === 1 ? 0.001 : 0), lng: (first.lng + last.lng) / 2 + (current.length === 1 ? 0.001 : 0) } : undefined;
    this.rows.push(group(point));
  }

  protected remove(index: number): void {
    this.rows.removeAt(index);
  }

  protected error(row: VertexGroup, field: 'lat' | 'lng'): string {
    const errors = row.controls[field].errors;
    if (!errors) {
      return '';
    }
    return errors['required'] ? 'Obligatorio' : field === 'lat' ? 'Entre -90 y 90' : 'Entre -180 y 180';
  }
}
