import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';

import { MasterDomainsService } from '../../../core/api/data/master-domains.service';
import { ResourceTypesApi } from '../../../core/api/data/resource-types.api';
import { ResourceType, ResourceTypeInput } from '../../../core/api/models';
import { RecordLoader } from '../../../shared/data/record-loader';
import { SubmitState } from '../../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../../shared/data/unsaved-changes.guard';
import { FocusFirstInvalidDirective } from '../../../shared/form/focus-first-invalid.directive';
import { FormActionsComponent } from '../../../shared/form/form-actions.component';
import { FormHeadComponent } from '../../../shared/form/form-head.component';
import { FormResultComponent } from '../../../shared/form/form-result.component';
import { notify } from '../../../shared/form/notify';
import { RESOURCE_CATEGORIES, profileLabel } from '../fleet-labels';
import { fleetReturnUrl, readHandoff, toHandoffState } from '../type-handoff';

import { CM3_PER_M3, CapacityMode, CapacityValues, decodeCapacity, encodeCapacity, volumeOfMeasures } from './capacity-codec';
import { CapacityField, capacityIssues } from './capacity-rules';

const FIELD_ERRORS = {
  required: 'Este campo es obligatorio',
  min: 'Debe ser mayor o igual que 0',
};

const CAPACITY_FIELDS: readonly CapacityField[] = ['weight', 'volume', 'width', 'height', 'depth', 'minWeight', 'maxWeight', 'minVolume', 'maxVolume'];
const NUMBER = new Intl.NumberFormat('es', { maximumFractionDigits: 2, useGrouping: false });

/** Valores de capacidad del formulario, tal como los editó la persona (kg, cm³ y cm). */
function capacityOf(group: FormGroup): CapacityValues {
  // getRawValue lee el valor ya actualizado de cada control (el `value` del grupo todavía no lo tiene mientras se valida uno)
  const raw = group.getRawValue() as Record<CapacityField | 'mode', unknown>;
  const number = (field: CapacityField): number | null => {
    const value = raw[field];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  return {
    mode: raw.mode === 'measure' ? 'measure' : 'volume',
    weight: number('weight'),
    volume: number('volume'),
    width: number('width'),
    height: number('height'),
    depth: number('depth'),
    minWeight: number('minWeight'),
    maxWeight: number('maxWeight'),
    minVolume: number('minVolume'),
    maxVolume: number('maxVolume'),
  };
}

/**
 * Error de un campo de capacidad: depende de los demás, así que se calcula con todos los valores del grupo. Solo se exige cuando la
 * persona ha tocado la capacidad: un tipo que ya traía una capacidad incompleta (solo el peso, por ejemplo) se puede renombrar sin más.
 */
function capacityValidator(field: CapacityField): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const group = control.parent;
    if (!(group instanceof FormGroup) || ![...CAPACITY_FIELDS, 'mode'].some((name) => group.get(name)?.dirty)) {
      return null;
    }
    const message = capacityIssues(capacityOf(group))[field];
    return message ? { capacity: message } : null;
  };
}

const optionalNumber = (field: CapacityField) => new FormControl<number | null>(null, { validators: [capacityValidator(field)] });

@Component({
  selector: 'app-resource-type-form',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, FocusFirstInvalidDirective, FormResultComponent, FormActionsComponent, FormHeadComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-type-form.component.html',
  styleUrl: './resource-type-form.component.scss',
})
export class ResourceTypeFormComponent implements HasUnsavedChanges {
  private readonly api = inject(ResourceTypesApi);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly masters = inject(MasterDomainsService);
  private readonly route = inject(ActivatedRoute).snapshot;
  private readonly id = this.route.paramMap.get('id');

  protected readonly isNew = this.id === null;
  protected readonly categories = RESOURCE_CATEGORIES;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<ResourceType>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);

  /** A dónde se vuelve al guardar o cancelar si se llegó desde el formulario de vehículo (`?volver=`); si no, al listado. */
  protected readonly returnTo = fleetReturnUrl(this.route.queryParamMap.get('volver'));
  /** El borrador del formulario de vehículo que viajó hasta aquí, para devolvérselo al volver. */
  private readonly handoff = readHandoff(this.router.currentNavigation()?.extras.state ?? inject(DOCUMENT).defaultView?.history.state);
  protected readonly returnState = this.handoff ? toHandoffState({ draft: this.handoff.draft }) : undefined;

  protected readonly profiles = computed(() =>
    this.masters.values('OsrmProfile').map((value) => ({ key: value.key, label: profileLabel(value.key) })),
  );

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    osrmProfile: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    gasMileage: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    mode: new FormControl<CapacityMode>('volume', { nonNullable: true }),
    weight: optionalNumber('weight'),
    volume: optionalNumber('volume'),
    width: optionalNumber('width'),
    height: optionalNumber('height'),
    depth: optionalNumber('depth'),
    minWeight: optionalNumber('minWeight'),
    maxWeight: optionalNumber('maxWeight'),
    minVolume: optionalNumber('minVolume'),
    maxVolume: optionalNumber('maxVolume'),
  });

  private readonly capacity = toSignal(this.form.valueChanges.pipe(startWith(null), map(() => capacityOf(this.form))), { initialValue: capacityOf(this.form) });
  protected readonly measured = computed(() => this.capacity().mode === 'measure');
  /** El volumen calculado con las tres medidas, «7956000 cm³ · 7,96 m³», o vacío si falta alguna. */
  protected readonly volumeText = computed(() => {
    const volume = volumeOfMeasures(this.capacity());
    return volume === null ? '' : `${NUMBER.format(volume)} cm³ · ${NUMBER.format(volume / CM3_PER_M3)} m³`;
  });

  constructor() {
    this.masters.load().subscribe({ error: () => undefined });
    // Cada campo de capacidad depende de los demás: al cambiar uno se revalidan todos
    this.form.valueChanges.subscribe(() => {
      for (const field of CAPACITY_FIELDS) {
        this.form.controls[field].updateValueAndValidity({ emitEvent: false });
      }
    });
    this.loader.load((record) => {
      const capacity = decodeCapacity(record);
      this.form.reset({ name: record.name, category: record.category, osrmProfile: record.osrmProfile, gasMileage: record.gasMileage, ...capacity });
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
  }

  protected error(name: 'name' | 'category' | 'osrmProfile' | 'gasMileage'): string {
    const errors = this.form.controls[name].errors;
    const key = errors ? (Object.keys(errors).find((k) => k in FIELD_ERRORS) as keyof typeof FIELD_ERRORS | undefined) : undefined;
    return key ? FIELD_ERRORS[key] : '';
  }

  protected capacityError(field: CapacityField): string {
    const message = this.form.controls[field].errors?.['capacity'];
    return typeof message === 'string' ? message : '';
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, category, osrmProfile, gasMileage } = this.form.getRawValue();
    const base: ResourceTypeInput = { name: name.trim(), category: category.trim(), osrmProfile };
    const current = this.loader.record();
    // La capacidad se fusiona con lo que trajo el gateway: las claves que la pantalla no conoce se conservan
    const encoded = encodeCapacity(capacityOf(this.form), current);
    const request$ =
      this.id === null
        ? this.api.create({
            ...base,
            ...(gasMileage === null ? {} : { gasMileage }),
            ...(encoded.capacity ? { capacity: encoded.capacity } : {}),
            ...(encoded.measure ? { measure: encoded.measure } : {}),
            ...(encoded.restriction ? { restriction: encoded.restriction } : {}),
          })
        : this.api.update(this.id, { ...base, gasMileage, ...encoded });

    this.submit.submit(request$, (record) => {
      this.saved.set(true);
      void notify(this.injector, this.id === null ? 'Tipo de vehículo creado' : 'Tipo de vehículo guardado');
      const state = this.handoff ? toHandoffState({ draft: this.handoff.draft, createdTypeId: record.id }) : undefined;
      void this.router.navigateByUrl(this.returnTo ?? '/flota/tipos', { state });
    });
  }
}
