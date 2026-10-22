import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MasterDomainsService } from '../../core/api/data/master-domains.service';
import { PlacesApi } from '../../core/api/data/places.api';
import { Place, PlaceInput } from '../../core/api/models';
import { fromGeoJsonPoint, toGeoJsonPoint } from '../../core/geo/lat-lng';
import { RecordLoader } from '../../shared/data/record-loader';
import { SubmitState } from '../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../shared/data/unsaved-changes.guard';
import { FocusFirstInvalidDirective } from '../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { notify } from '../../shared/form/notify';
import { LocationFieldsComponent, createLocationGroup } from '../../shared/map/location-fields.component';

import { PLACE_TYPE_LABELS, placeTypeLabel } from './place-labels';

/** Dígitos, espacios, paréntesis y guiones con un `+` inicial opcional, de 7 a 20 caracteres. */
export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

const FIELD_ERRORS: Readonly<Record<string, string>> = {
  required: 'Este campo es obligatorio',
  pattern: 'Escribe un teléfono válido: de 7 a 20 caracteres con dígitos, espacios, paréntesis o guiones, y un + inicial opcional',
};

@Component({
  selector: 'app-place-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    FocusFirstInvalidDirective,
    FormResultComponent,
    LocationFieldsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isNew ? 'Nuevo lugar' : 'Editar lugar' }}</h1>
    @switch (loader.status()) {
      @case ('loading') {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando" />
      }
      @case ('missing') {
        <app-form-result [error]="loader.error()" />
        <a mat-stroked-button routerLink="/lugares">Volver al listado</a>
      }
      @case ('error') {
        <app-form-result [error]="loader.error()" />
        <a mat-stroked-button routerLink="/lugares">Volver al listado</a>
      }
      @default {
        <form [formGroup]="form" (ngSubmit)="save()" appFocusFirstInvalid novalidate>
          <mat-form-field>
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" autocomplete="off" />
            <mat-error>{{ error('name') }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="type">
              @for (type of types(); track type.key) {
                <mat-option [value]="type.key">{{ type.label }}</mat-option>
              }
            </mat-select>
            <mat-error>{{ error('type') }}</mat-error>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Dirección (opcional)</mat-label>
            <input matInput formControlName="address" autocomplete="off" />
            <mat-hint>Se guarda como texto: no se calcula la ubicación a partir de ella</mat-hint>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Teléfono (opcional)</mat-label>
            <input matInput type="tel" formControlName="phoneNumber" autocomplete="off" />
            <mat-error>{{ error('phoneNumber') }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Persona de contacto (opcional)</mat-label>
            <input matInput formControlName="contactName" autocomplete="off" />
          </mat-form-field>
          <app-location-fields [location]="form.controls.location" />
          <app-form-result [error]="submit.error()" />
          <div class="buttons">
            <a mat-button routerLink="/lugares">Cancelar</a>
            <button mat-flat-button type="submit" [disabled]="submit.submitting()">Guardar</button>
          </div>
        </form>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 640px;
    }
    h1 {
      margin: 0 0 16px;
      font: var(--mat-sys-headline-small);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }
  `,
})
export class PlaceFormComponent implements HasUnsavedChanges {
  private readonly api = inject(PlacesApi);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly masters = inject(MasterDomainsService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly isNew = this.id === null;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<Place>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);

  /** Valores del dominio `PlaceType` del gateway o, si aún no hay (o no existe), los habituales. */
  protected readonly types = computed(() => {
    const values = this.masters.values('PlaceType');
    const keys = values.length ? values.map((v) => v.key) : Object.keys(PLACE_TYPE_LABELS);
    return keys.map((key) => ({ key, label: placeTypeLabel(key) }));
  });

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    address: new FormControl('', { nonNullable: true }),
    phoneNumber: new FormControl('', { nonNullable: true, validators: [Validators.pattern(PHONE_PATTERN)] }),
    contactName: new FormControl('', { nonNullable: true }),
    location: createLocationGroup(),
  });

  constructor() {
    this.masters.load().subscribe({ error: () => undefined });
    this.loader.load((place) => {
      const point = fromGeoJsonPoint(place.location?.coordinates);
      this.form.reset({
        name: place.name,
        type: place.type,
        address: place.address ?? '',
        phoneNumber: place.phoneNumber ?? '',
        contactName: place.contactName ?? '',
        location: { lat: point?.lat ?? null, lng: point?.lng ?? null },
      });
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
  }

  protected error(name: 'name' | 'type' | 'phoneNumber'): string {
    const errors = this.form.controls[name].errors;
    const key = errors ? Object.keys(errors).find((k) => FIELD_ERRORS[k]) : undefined;
    return key ? FIELD_ERRORS[key] : '';
  }

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const location = toGeoJsonPoint({ lat: value.location.lat as number, lng: value.location.lng as number });
    if (!location) {
      return;
    }
    const address = value.address.trim();
    const phone = value.phoneNumber.trim();
    const contact = value.contactName.trim();
    const base: PlaceInput = { name: value.name.trim(), type: value.type, location };

    const request$ =
      this.id === null
        ? this.api.create({ ...base, ...(address ? { address } : {}), ...(phone ? { phoneNumber: phone } : {}), ...(contact ? { contactName: contact } : {}) })
        : // `zoneId` no se edita aquí: se reenvía para que la actualización no lo borre
          this.api.update(this.id, {
            ...base,
            address: address || null,
            phoneNumber: phone || null,
            contactName: contact || null,
            zoneId: this.loader.record()?.zoneId ?? null,
          });

    this.submit.submit(request$, () => {
      this.saved.set(true);
      void notify(this.injector, this.id === null ? 'Lugar creado' : 'Lugar guardado');
      void this.router.navigateByUrl('/lugares');
    });
  }
}
