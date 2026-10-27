import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MasterDomainsService } from '../../../core/api/data/master-domains.service';
import { ResourceTypesApi } from '../../../core/api/data/resource-types.api';
import { ResourceType, ResourceTypeInput } from '../../../core/api/models';
import { RecordLoader } from '../../../shared/data/record-loader';
import { SubmitState } from '../../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../../shared/data/unsaved-changes.guard';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { notify } from '../../../shared/form/notify';
import { RESOURCE_CATEGORIES, profileLabel } from '../fleet-labels';

const FIELD_ERRORS = {
  required: 'Este campo es obligatorio',
  min: 'Debe ser mayor o igual que 0',
};

@Component({
  selector: 'app-resource-type-form',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, FocusFirstInvalidDirective, FormResultComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ isNew ? 'Nuevo tipo de vehículo' : 'Editar tipo de vehículo' }}</h1>
    @switch (loader.status()) {
      @case ('loading') {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando" />
      }
      @case ('missing') {
        <app-form-result [error]="loader.error()" />
        <a mat-stroked-button routerLink="/flota/tipos">Volver al listado</a>
      }
      @case ('error') {
        <app-form-result [error]="loader.error()" />
        <a mat-stroked-button routerLink="/flota/tipos">Volver al listado</a>
      }
      @default {
        <form class="card form-grid" [formGroup]="form" (ngSubmit)="save()" appFocusFirstInvalid novalidate>
          <mat-form-field>
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" autocomplete="off" />
            <mat-error>{{ error('name') }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Categoría</mat-label>
            <input matInput formControlName="category" autocomplete="off" list="resource-categories" />
            <datalist id="resource-categories">
              @for (category of categories; track category) {
                <option [value]="category"></option>
              }
            </datalist>
            <mat-error>{{ error('category') }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Perfil de ruteo</mat-label>
            <mat-select formControlName="osrmProfile">
              @for (profile of profiles(); track profile.key) {
                <mat-option [value]="profile.key">{{ profile.label }}</mat-option>
              }
            </mat-select>
            <mat-error>{{ error('osrmProfile') }}</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Consumo de combustible (opcional)</mat-label>
            <input matInput type="number" min="0" step="any" formControlName="gasMileage" autocomplete="off" />
            <mat-error>{{ error('gasMileage') }}</mat-error>
          </mat-form-field>
          <app-form-result [error]="submit.error()" />
          <div class="form-actions">
            <a mat-button routerLink="/flota/tipos">Cancelar</a>
            <button mat-flat-button type="submit" [disabled]="submit.submitting()">Guardar</button>
          </div>
        </form>
      }
    }
  `,
})
export class ResourceTypeFormComponent implements HasUnsavedChanges {
  private readonly api = inject(ResourceTypesApi);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly masters = inject(MasterDomainsService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly isNew = this.id === null;
  protected readonly categories = RESOURCE_CATEGORIES;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<ResourceType>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);

  protected readonly profiles = computed(() =>
    this.masters.values('OsrmProfile').map((value) => ({ key: value.key, label: profileLabel(value.key) })),
  );

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    osrmProfile: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    gasMileage: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
  });

  constructor() {
    this.masters.load().subscribe({ error: () => undefined });
    this.loader.load((record) =>
      this.form.reset({
        name: record.name,
        category: record.category,
        osrmProfile: record.osrmProfile,
        gasMileage: record.gasMileage,
      }),
    );
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
  }

  protected error(name: keyof typeof this.form.controls): string {
    const errors = this.form.controls[name].errors;
    const key = errors ? (Object.keys(errors).find((k) => k in FIELD_ERRORS) as keyof typeof FIELD_ERRORS | undefined) : undefined;
    return key ? FIELD_ERRORS[key] : '';
  }

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const { name, category, osrmProfile, gasMileage } = this.form.getRawValue();
    const base: ResourceTypeInput = { name: name.trim(), category: category.trim(), osrmProfile };
    const current = this.loader.record();
    // capacity, measure y restriction no tienen contrato documentado: se reenvían tal cual al editar
    const request$ =
      this.id === null
        ? this.api.create(gasMileage === null ? base : { ...base, gasMileage })
        : this.api.update(this.id, { ...base, gasMileage, capacity: current?.capacity ?? null, measure: current?.measure ?? null, restriction: current?.restriction ?? null });

    this.submit.submit(request$, () => {
      this.saved.set(true);
      void notify(this.injector, this.id === null ? 'Tipo de vehículo creado' : 'Tipo de vehículo guardado');
      void this.router.navigateByUrl('/flota/tipos');
    });
  }
}
