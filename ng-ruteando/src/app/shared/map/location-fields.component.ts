import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { startWith } from 'rxjs';

import { LatLng, latLng } from '../../core/geo/lat-lng';

import { MapViewComponent } from './map-view.component';

export type LocationGroup = FormGroup<{ lat: FormControl<number | null>; lng: FormControl<number | null> }>;

/** Grupo de formulario con latitud y longitud obligatorias y dentro de rango. */
export function createLocationGroup(point: LatLng | null = null): LocationGroup {
  return new FormGroup({
    lat: new FormControl<number | null>(point?.lat ?? null, [Validators.required, Validators.min(-90), Validators.max(90)]),
    lng: new FormControl<number | null>(point?.lng ?? null, [Validators.required, Validators.min(-180), Validators.max(180)]),
  });
}

/**
 * Ubicación con campos de latitud y longitud y mapa, sincronizados en ambos sentidos. Los campos van
 * primero y son la vía accesible: el mapa no se puede operar con teclado. Un par incompleto o fuera de
 * rango no mueve el marcador.
 */
@Component({
  selector: 'app-location-fields',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MapViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="layout">
      <div class="coordinates">
        <mat-form-field>
          <mat-label>Latitud</mat-label>
          <input matInput type="number" step="any" inputmode="decimal" autocomplete="off" [formControl]="location().controls.lat" />
          <mat-error>{{ error('lat') }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Longitud</mat-label>
          <input matInput type="number" step="any" inputmode="decimal" autocomplete="off" [formControl]="location().controls.lng" />
          <mat-error>{{ error('lng') }}</mat-error>
        </mat-form-field>
      </div>
      <app-map-view
        [point]="point()"
        [selectable]="true"
        ariaLabel="Mapa para elegir la ubicación. También puedes escribir la latitud y la longitud en sus campos."
        (pointChange)="pick($event)"
      />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    /* Los campos primero (en el orden de lectura) y, desde 720px, el mapa a su lado; por debajo, uno sobre otro */
    .layout {
      display: grid;
      gap: 12px 20px;
    }
    .coordinates {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px 16px;
      align-content: start;
    }
    @media (min-width: 720px) {
      .layout {
        grid-template-columns: minmax(200px, 1fr) minmax(0, 2fr);
        align-items: start;
      }
      .coordinates {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class LocationFieldsComponent {
  readonly location = input.required<LocationGroup>();

  /** Punto del marcador: el último par válido escrito o elegido. */
  protected readonly point = signal<LatLng | null>(null);

  constructor() {
    effect((onCleanup) => {
      const group = this.location();
      const subscription = group.valueChanges.pipe(startWith(group.value)).subscribe((value) => {
        const valid = latLng(value.lat, value.lng);
        if (valid) {
          this.point.set(valid);
        }
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected pick(point: LatLng): void {
    const group = this.location();
    group.patchValue(point);
    group.markAsDirty();
  }

  protected error(name: 'lat' | 'lng'): string {
    const errors = this.location().controls[name].errors;
    if (!errors) {
      return '';
    }
    if (errors['required']) {
      return 'Este campo es obligatorio';
    }
    return name === 'lat' ? 'La latitud debe estar entre -90 y 90' : 'La longitud debe estar entre -180 y 180';
  }
}
