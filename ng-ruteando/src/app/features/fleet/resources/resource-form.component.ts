import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PlacesApi } from '../../../core/api/data/places.api';
import { ResourceTypesApi } from '../../../core/api/data/resource-types.api';
import { ResourcesApi } from '../../../core/api/data/resources.api';
import { Place, Resource, ResourceInput, ResourceType } from '../../../core/api/models';
import { RecordLoader } from '../../../shared/data/record-loader';
import { SubmitState } from '../../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../../shared/data/unsaved-changes.guard';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormActionsComponent } from '../../../shared/form/form-actions.component';
import { FormHeadComponent } from '../../../shared/form/form-head.component';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { notify } from '../../../shared/form/notify';

import { fromUtcIso, localDateOf, minutesToSeconds, secondsToMinutes, shiftErrors, toUtcIso, todayLocalDate } from '../../../shared/time/shift-time';
import { readHandoff, toHandoffState } from '../type-handoff';

/** Cuántos tipos y lugares se cargan en los selectores; si hay más, el formulario avisa. */
export const SELECT_LIMIT = 200;

const DUPLICATE_PLATE = 'Ya existe un vehículo con esa matrícula';

const FIELD_ERRORS: Readonly<Record<string, string>> = {
  required: 'Este campo es obligatorio',
  min: 'La cantidad debe ser al menos 1',
  shiftNotPositive: 'La duración debe ser mayor que 0',
  shiftTooLong: 'El turno no puede durar más de 24 horas (1440 minutos)',
  breakNegative: 'El descanso no puede ser negativo',
};

/** Lo escrito en el formulario, para no perderlo al ir a crear un tipo y volver. */
interface VehicleDraft {
  name: string;
  licensePlate: string;
  resourceTypeId: string;
  depotId: string;
  shiftStart: string;
  shiftDurationMin: number | null;
  breakDurationMin: number | null;
  quantity: number | null;
  anchorDate: string;
}

const isText = (value: unknown): value is string => typeof value === 'string';
const isNumberOrNull = (value: unknown): value is number | null => value === null || (typeof value === 'number' && Number.isFinite(value));

/** Lee un borrador que llegó en el estado de la navegación; si le falta algo o no es del tipo esperado, se ignora. */
function asVehicleDraft(value: unknown): VehicleDraft | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const d = value as Record<keyof VehicleDraft, unknown>;
  const ok =
    isText(d.name) && isText(d.licensePlate) && isText(d.resourceTypeId) && isText(d.depotId) && isText(d.shiftStart) && isText(d.anchorDate) &&
    isNumberOrNull(d.shiftDurationMin) && isNumberOrNull(d.breakDurationMin) && isNumberOrNull(d.quantity);
  return ok ? (d as unknown as VehicleDraft) : null;
}

type FieldName = 'name' | 'resourceTypeId' | 'depotId' | 'shiftStart' | 'shiftDurationMin' | 'breakDurationMin' | 'quantity';

function shiftDurationValidator(control: AbstractControl): ValidationErrors | null {
  const errors = shiftErrors(Number(control.value), 0).filter((e) => e !== 'breakNegative');
  return errors.length ? { [errors[0]]: true } : null;
}

function breakValidator(control: AbstractControl): ValidationErrors | null {
  return shiftErrors(1, Number(control.value)).includes('breakNegative') ? { breakNegative: true } : null;
}

@Component({
  selector: 'app-resource-form',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, FocusFirstInvalidDirective, FormResultComponent, FormActionsComponent, FormHeadComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-form.component.html',
  styleUrl: './resource-form.component.scss',
})
export class ResourceFormComponent implements HasUnsavedChanges {
  private readonly api = inject(ResourcesApi);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  /** El borrador (y el tipo recién creado) con que se vuelve de `Crear tipo`, si se vuelve de ahí. */
  private readonly handoff = readHandoff(this.router.currentNavigation()?.extras.state ?? inject(DOCUMENT).defaultView?.history.state);

  protected readonly isNew = this.id === null;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<Resource>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);
  /** Mientras se va a crear un tipo no se pregunta por cambios sin guardar: el borrador viaja con la navegación. */
  private readonly leaving = signal(false);
  /** Fecha local a la que se ancla la hora del turno (la del vehículo al editar, hoy al crear). */
  private anchorDate = todayLocalDate();

  protected readonly types = signal<readonly ResourceType[]>([]);
  protected readonly places = signal<readonly Place[]>([]);
  protected readonly typesLoaded = signal(false);
  protected readonly placesLoaded = signal(false);
  protected readonly typesTruncated = signal(false);
  protected readonly placesTruncated = signal(false);
  protected readonly selectLimit = SELECT_LIMIT;

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    licensePlate: new FormControl('', { nonNullable: true }),
    resourceTypeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    depotId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    shiftStart: new FormControl('08:00', { nonNullable: true, validators: [Validators.required] }),
    shiftDurationMin: new FormControl<number | null>(480, { validators: [Validators.required, shiftDurationValidator] }),
    breakDurationMin: new FormControl<number | null>(60, { validators: [Validators.required, breakValidator] }),
    quantity: new FormControl<number | null>(1, { validators: [Validators.required, Validators.min(1)] }),
  });

  constructor() {
    inject(ResourceTypesApi)
      .list({ page: 0, size: SELECT_LIMIT })
      .subscribe({
        next: (page) => {
          this.types.set(page.content);
          this.typesTruncated.set(page.totalElements > page.content.length);
          this.typesLoaded.set(true);
          if (this.handoff?.createdTypeId) {
            this.form.controls.resourceTypeId.setValue(this.handoff.createdTypeId);
            this.form.markAsDirty();
          }
        },
        error: () => this.typesLoaded.set(true),
      });
    inject(PlacesApi)
      .list({ page: 0, size: SELECT_LIMIT })
      .subscribe({
        next: (page) => {
          this.places.set(page.content);
          this.placesTruncated.set(page.totalElements > page.content.length);
          this.placesLoaded.set(true);
        },
        error: () => this.placesLoaded.set(true),
      });

    this.loader.load((resource) => {
      this.anchorDate = localDateOf(resource.shiftStartUtc);
      this.form.reset({
        name: resource.name,
        licensePlate: resource.licensePlate ?? '',
        resourceTypeId: resource.resourceTypeId,
        depotId: resource.depotId,
        shiftStart: fromUtcIso(resource.shiftStartUtc),
        shiftDurationMin: secondsToMinutes(resource.shiftDurationSec),
        breakDurationMin: secondsToMinutes(resource.breakDurationSec),
        quantity: resource.quantity,
      });
      this.restoreDraft();
    });
    if (this.isNew) {
      this.restoreDraft();
    }
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved() && !this.leaving();
  }

  /** Va a crear un tipo con el borrador a cuestas; al guardarlo vuelve aquí con el tipo ya elegido. */
  protected createType(): void {
    this.leaving.set(true);
    const draft: VehicleDraft = { ...this.form.getRawValue(), anchorDate: this.anchorDate };
    void this.router
      .navigate(['/flota/tipos/nuevo'], { queryParams: { volver: this.router.url.split('?')[0] }, state: toHandoffState({ draft }) })
      // Si la navegación no llega a producirse, el aviso de cambios sin guardar vuelve a proteger lo escrito
      .then((navigated) => {
        if (!navigated) {
          this.leaving.set(false);
        }
      });
  }

  private restoreDraft(): void {
    const draft = asVehicleDraft(this.handoff?.draft);
    if (!draft) {
      return;
    }
    const { anchorDate, ...values } = draft;
    this.anchorDate = anchorDate;
    this.form.reset(values);
    this.form.markAsDirty();
    if (this.handoff?.createdTypeId) {
      this.form.controls.resourceTypeId.setValue(this.handoff.createdTypeId);
    }
  }

  protected error(name: FieldName): string {
    const errors = this.form.controls[name].errors;
    const key = errors ? Object.keys(errors).find((k) => FIELD_ERRORS[k]) : undefined;
    return key ? FIELD_ERRORS[key] : '';
  }

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const plate = value.licensePlate.trim();
    const quantity = value.quantity as number;
    const base: ResourceInput = {
      name: value.name.trim(),
      resourceTypeId: value.resourceTypeId,
      depotId: value.depotId,
      shiftStartUtc: toUtcIso(value.shiftStart, this.anchorDate),
      shiftDurationSec: minutesToSeconds(value.shiftDurationMin as number),
      breakDurationSec: minutesToSeconds(value.breakDurationMin as number),
    };
    // En el alta solo se envía lo que se aparta del valor por defecto del gateway. Al editar se reenvía lo que el formulario no toca
    // (tipos de paquete y zonas permitidos): si el gateway sustituye en lugar de fusionar, guardar no debe borrarlos
    const current = this.loader.record();
    const request$ =
      this.id === null
        ? this.api.create({ ...base, ...(plate ? { licensePlate: plate } : {}), ...(quantity !== 1 ? { quantity } : {}) })
        : this.api.update(this.id, {
            ...base,
            licensePlate: plate || null,
            quantity,
            allowedPackageTypes: current?.allowedPackageTypes ?? null,
            allowedZoneIds: current?.allowedZoneIds ?? null,
          });

    this.submit.submit(
      request$,
      () => {
        this.saved.set(true);
        void notify(this.injector, this.id === null ? 'Vehículo creado' : 'Vehículo guardado');
        void this.router.navigateByUrl('/flota/vehiculos');
      },
      { 409: DUPLICATE_PLATE },
    );
  }
}
