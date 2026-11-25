import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { GeocodeResult } from '../../../core/api/models';
import { fromGeoJsonPoint, LatLng, latLng, toGeoJsonPoint } from '../../../core/geo/lat-lng';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { OUTLINED_FIELDS_PROVIDER } from '../../../shared/form/outlined-fields';
import { AddressLocatorComponent } from '../../../shared/map/address-locator.component';
import { createLocationGroup, LocationFieldsComponent } from '../../../shared/map/location-fields.component';
import { ReviewRow } from './package-locating';

const same = (a: LatLng | null, b: LatLng | null): boolean => !!a && !!b && a.lat === b.lat && a.lng === b.lng;

/**
 * Corrige la ubicación de una fila de la importación: se puede cambiar la dirección y volver a ubicarla, o colocar el
 * punto en el mapa (queda como «manual»). Se cierra con la fila ya actualizada o sin valor al cancelar.
 */
@Component({
  selector: 'app-location-fix-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    AddressLocatorComponent,
    LocationFieldsComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OUTLINED_FIELDS_PROVIDER],
  template: `
    <h2 mat-dialog-title>{{ 'Corregir la ubicación de la línea {0}' | t: [row.line] }}</h2>
    <mat-dialog-content class="content">
      <mat-form-field class="full">
        <mat-label>{{ 'Dirección' | t }}</mat-label>
        <input matInput [formControl]="address" autocomplete="off" cdkFocusInitial />
      </mat-form-field>
      <div class="pair">
        <mat-form-field>
          <mat-label>{{ 'Ciudad' | t }}</mat-label>
          <input matInput [formControl]="city" autocomplete="off" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>{{ 'País' | t }}</mat-label>
          <input matInput [formControl]="country" autocomplete="off" />
        </mat-form-field>
      </div>
      <app-address-locator
        [address]="address"
        [city]="city"
        [country]="country"
        [location]="location"
        (located)="geocoded.set($event)"
      />
      <app-location-fields [location]="location" />
      @if (missingPoint()) {
        <p class="error" role="alert">{{ 'Elige un punto en el mapa o escribe la latitud y la longitud' | t }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'Cancelar' | t }}</button>
      <button mat-flat-button type="button" (click)="save()">{{ 'Guardar' | t }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: grid;
      gap: 4px;
      padding-top: 8px;
    }
    .pair {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0 16px;
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class LocationFixDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<LocationFixDialogComponent, ReviewRow>);
  protected readonly row = inject<ReviewRow>(MAT_DIALOG_DATA);

  protected readonly address = new FormControl(this.row.input.address, { nonNullable: true });
  protected readonly city = new FormControl(this.row.input.city ?? '', { nonNullable: true });
  protected readonly country = new FormControl(this.row.input.country ?? '', { nonNullable: true });
  private readonly initialPoint = fromGeoJsonPoint(this.row.input.location?.coordinates);
  protected readonly location = createLocationGroup(this.initialPoint);

  /** Lo último que devolvió el geocodificador en este diálogo: decide si el punto guardado es suyo o puesto a mano. */
  protected readonly geocoded = signal<GeocodeResult | null>(null);
  protected readonly missingPoint = signal(false);

  protected save(): void {
    const { lat, lng } = this.location.getRawValue();
    const point = latLng(lat, lng);
    const location = point ? toGeoJsonPoint(point) : null;
    if (!point || !location) {
      this.location.markAllAsTouched();
      this.missingPoint.set(true);
      return;
    }
    const geocoded = this.geocoded();
    const fromGeocoder = geocoded && geocoded.status !== 'unmatch' && same(point, geocoded.location);
    // Si el punto no se movió desde que estaba (ubicado por el geocodificador al importar), conserva su estado
    const untouched = same(point, this.initialPoint) && this.row.status !== 'manual' && !geocoded;
    const meta = fromGeocoder
      ? { status: geocoded.status, standardizedAddress: geocoded.standardizedAddress, score: geocoded.score }
      : untouched
        ? { status: this.row.status, standardizedAddress: this.row.standardizedAddress, score: this.row.score }
        : { status: 'manual' as const, standardizedAddress: null, score: null };
    const text = (control: FormControl<string>) => control.value.trim();
    this.dialogRef.close({
      ...this.row,
      ...meta,
      failed: false,
      input: {
        ...this.row.input,
        address: text(this.address) || this.row.input.address,
        city: text(this.city) || null,
        country: text(this.country) || null,
        location,
      },
    } satisfies ReviewRow);
  }
}
