import { ChangeDetectionStrategy, Component, DestroyRef, Injector, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MasterDomainsService } from '../../core/api/data/master-domains.service';
import { PlacesApi } from '../../core/api/data/places.api';
import { ResourcesApi } from '../../core/api/data/resources.api';
import { SettingsApi } from '../../core/api/data/settings.api';
import { Place, Resource, Settings, SettingsInput } from '../../core/api/models';
import { RecordLoader } from '../../shared/data/record-loader';
import { SubmitState } from '../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../shared/data/unsaved-changes.guard';
import { FocusFirstInvalidDirective } from '../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { notify } from '../../shared/form/notify';
import { fromUtcIso, localDateOf, minutesToSeconds, secondsToMinutes, shiftErrors, toUtcIso, todayLocalDate } from '../../shared/time/shift-time';

import {
  DEFAULT_LENGTH_OF_STAY_TYPES,
  DEFAULT_RESTRICTION_TYPES,
  DEFAULT_ROUTE_TOPOLOGIES,
  lengthOfStayLabel,
  restrictionTypeLabel,
  routeTopologyLabel,
} from './settings-labels';

/** Cuántos lugares y vehículos se cargan en los selectores; si hay más, el formulario avisa. */
export const SELECT_LIMIT = 200;

export const FIXED_ROUTES = 'fixed_routes';
export const FIXED_STAY = 'fixed';
const NO_STAY = '';

/** Campos que el gateway calcula o resume: no se reenvían al guardar. */
const READ_ONLY_FIELDS: readonly (keyof Settings)[] = ['id', 'tenantId', 'createdAt', 'updatedAt', 'createdBy', 'placeStart', 'placeEnd', 'resources'];

const FIELD_ERRORS: Readonly<Record<string, string>> = {
  required: 'Este campo es obligatorio',
  min: 'Escribe un valor válido',
  whole: 'Escribe un número entero de 1 o más',
  shiftNotPositive: 'La duración debe ser mayor que 0',
  shiftTooLong: 'El turno no puede durar más de 24 horas (1440 minutos)',
  breakNegative: 'El descanso no puede ser negativo',
  positive: 'Escribe un valor mayor que 0',
};

type FieldName =
  | 'description'
  | 'routeTopology'
  | 'restrictionType'
  | 'placeStartId'
  | 'resourceIds'
  | 'fixedRoutes'
  | 'shiftStart'
  | 'shiftDurationMin'
  | 'breakDurationMin'
  | 'lengthOfStay';

const wholeRoutes = (c: AbstractControl): ValidationErrors | null =>
  c.value === null || c.value === '' || (Number.isInteger(c.value) && c.value >= 1) ? null : { whole: true };
const positive = (c: AbstractControl): ValidationErrors | null => (c.value === null || c.value === '' || Number(c.value) > 0 ? null : { positive: true });
const shiftDuration = (c: AbstractControl): ValidationErrors | null => {
  const errors = shiftErrors(Number(c.value), 0).filter((e) => e !== 'breakNegative');
  return errors.length ? { [errors[0]]: true } : null;
};
const breakDuration = (c: AbstractControl): ValidationErrors | null => (shiftErrors(1, Number(c.value)).includes('breakNegative') ? { breakNegative: true } : null);

/**
 * Cuerpo del PUT: el registro cargado sin los campos de solo lectura ni los resúmenes y con lo editado
 * encima, para no perder `globalShiftActive`, `globalBreakActive` ni `active` si el gateway reemplaza el recurso.
 */
export function buildSettingsUpdateBody(record: Settings, edited: Partial<SettingsInput>): Partial<SettingsInput> {
  const body: Record<string, unknown> = { ...record };
  for (const field of READ_ONLY_FIELDS) {
    delete body[field];
  }
  return { ...body, ...edited } as Partial<SettingsInput>;
}

@Component({
  selector: 'app-settings-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    FocusFirstInvalidDirective,
    FormResultComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-form.component.html',
  styleUrl: './settings-form.component.scss',
})
export class SettingsFormComponent implements HasUnsavedChanges {
  private readonly api = inject(SettingsApi);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly masters = inject(MasterDomainsService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isNew = this.id === null;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<Settings>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);
  /** Fecha local a la que se ancla la hora del turno (la de la configuración al editar, hoy al crear). */
  private anchorDate = todayLocalDate();

  protected readonly selectLimit = SELECT_LIMIT;
  protected readonly places = signal<readonly Place[]>([]);
  protected readonly vehicles = signal<readonly Resource[]>([]);
  protected readonly placesLoaded = signal(false);
  protected readonly vehiclesLoaded = signal(false);
  protected readonly placesTruncated = signal(false);
  protected readonly vehiclesTruncated = signal(false);

  protected readonly topologies = computed(() => this.options('RouteTopology', DEFAULT_ROUTE_TOPOLOGIES, routeTopologyLabel));
  protected readonly restrictions = computed(() => this.options('RestrictionType', DEFAULT_RESTRICTION_TYPES, restrictionTypeLabel));
  protected readonly stayTypes = computed(() => this.options('TypeLengthOfStay', DEFAULT_LENGTH_OF_STAY_TYPES, lengthOfStayLabel));

  protected readonly form = new FormGroup({
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    routeTopology: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    restrictionType: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    placeStartId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    placeEndId: new FormControl('', { nonNullable: true }),
    resourceIds: new FormControl<string[]>([], { nonNullable: true, validators: [Validators.required] }),
    evaluateWeight: new FormControl(false, { nonNullable: true }),
    evaluateVolume: new FormControl(false, { nonNullable: true }),
    evaluateItineraryZone: new FormControl(false, { nonNullable: true }),
    fixedRoutes: new FormControl<number | null>(null, [Validators.required, wholeRoutes]),
    shiftStart: new FormControl('08:00', { nonNullable: true, validators: [Validators.required] }),
    shiftDurationMin: new FormControl<number | null>(480, [Validators.required, shiftDuration]),
    breakDurationMin: new FormControl<number | null>(60, [Validators.required, breakDuration]),
    typeLengthOfStay: new FormControl(NO_STAY, { nonNullable: true }),
    lengthOfStay: new FormControl<number | null>(null, [Validators.required, positive]),
  });

  /** Tipo de restricción elegido, para decidir qué secciones se muestran. */
  protected readonly restriction = signal('');
  protected readonly stay = signal(NO_STAY);
  protected readonly showFixedRoutes = computed(() => this.restriction() === FIXED_ROUTES);
  protected readonly showShift = computed(() => this.restriction() !== '' && this.restriction() !== FIXED_ROUTES);
  protected readonly showStayValue = computed(() => this.stay() === FIXED_STAY);

  constructor() {
    this.applySections();
    this.form.controls.restrictionType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applySections());
    this.form.controls.typeLengthOfStay.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applySections());

    this.masters.load().subscribe({ error: () => undefined });
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
    inject(ResourcesApi)
      .list({ page: 0, size: SELECT_LIMIT })
      .subscribe({
        next: (page) => {
          this.vehicles.set(page.content);
          this.vehiclesTruncated.set(page.totalElements > page.content.length);
          this.vehiclesLoaded.set(true);
        },
        error: () => this.vehiclesLoaded.set(true),
      });

    this.loader.load((record) => {
      if (record.shiftStartUtc) {
        this.anchorDate = localDateOf(record.shiftStartUtc);
      }
      this.form.reset({
        description: record.description,
        routeTopology: record.routeTopology,
        restrictionType: record.restrictionType,
        placeStartId: record.placeStartId,
        placeEndId: record.placeEndId && record.placeEndId !== record.placeStartId ? record.placeEndId : '',
        resourceIds: record.resourceIds ?? [],
        evaluateWeight: record.evaluateWeight,
        evaluateVolume: record.evaluateVolume,
        evaluateItineraryZone: record.evaluateItineraryZone,
        fixedRoutes: record.fixedRoutes,
        shiftStart: record.shiftStartUtc ? fromUtcIso(record.shiftStartUtc) : '08:00',
        shiftDurationMin: record.shiftDurationSec === null ? 480 : secondsToMinutes(record.shiftDurationSec),
        breakDurationMin: record.breakDurationSec === null ? 60 : secondsToMinutes(record.breakDurationSec),
        typeLengthOfStay: record.typeLengthOfStay ?? NO_STAY,
        lengthOfStay: record.lengthOfStay,
      });
      this.applySections();
    });
  }

  /** Activa solo los controles de las secciones que aplican: los demás ni se validan ni se envían. */
  private applySections(): void {
    const { restrictionType, typeLengthOfStay, fixedRoutes, shiftStart, shiftDurationMin, breakDurationMin, lengthOfStay } = this.form.controls;
    this.restriction.set(restrictionType.value);
    this.stay.set(typeLengthOfStay.value);
    const toggle = (controls: AbstractControl[], on: boolean) => controls.forEach((c) => (on ? c.enable({ emitEvent: false }) : c.disable({ emitEvent: false })));
    toggle([fixedRoutes], restrictionType.value === FIXED_ROUTES);
    toggle([shiftStart, shiftDurationMin, breakDurationMin], restrictionType.value !== '' && restrictionType.value !== FIXED_ROUTES);
    toggle([lengthOfStay], typeLengthOfStay.value === FIXED_STAY);
  }

  private options(domain: string, defaults: string[], labelOf: (key: string | null) => string) {
    const values = this.masters.values(domain);
    const keys = values.length ? values.map((v) => v.key) : defaults;
    return keys.map((key) => ({ key, label: labelOf(key) }));
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
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
    const fixed = value.restrictionType === FIXED_ROUTES;
    const stayFixed = value.typeLengthOfStay === FIXED_STAY;
    const hasStayType = value.typeLengthOfStay !== NO_STAY;

    const record = this.loader.record();
    if (this.id !== null && !record) {
      return;
    }
    const required: SettingsInput = {
      description: value.description.trim(),
      routeTopology: value.routeTopology,
      restrictionType: value.restrictionType,
      resourceIds: value.resourceIds,
      placeStartId: value.placeStartId,
    };
    const shift = {
      shiftStartUtc: toUtcIso(value.shiftStart, this.anchorDate),
      shiftDurationSec: minutesToSeconds(value.shiftDurationMin as number),
      breakDurationSec: minutesToSeconds(value.breakDurationMin as number),
    };

    const request$ =
      this.id === null || !record
        ? // En el alta solo se envía lo que aplica y lo que se aparta del valor por defecto
          this.api.create({
            ...required,
            ...(value.placeEndId ? { placeEndId: value.placeEndId } : {}),
            ...(fixed ? { fixedRoutes: value.fixedRoutes } : shift),
            ...(value.evaluateWeight ? { evaluateWeight: true } : {}),
            ...(value.evaluateVolume ? { evaluateVolume: true } : {}),
            ...(value.evaluateItineraryZone ? { evaluateItineraryZone: true } : {}),
            ...(hasStayType ? { typeLengthOfStay: value.typeLengthOfStay, ...(stayFixed ? { lengthOfStay: value.lengthOfStay } : {}) } : {}),
          })
        : this.api.update(
            this.id,
            buildSettingsUpdateBody(record, {
              ...required,
              placeEndId: value.placeEndId || value.placeStartId,
              evaluateWeight: value.evaluateWeight,
              evaluateVolume: value.evaluateVolume,
              evaluateItineraryZone: value.evaluateItineraryZone,
              // Las secciones que no aplican se envían como null para no dejar valores obsoletos
              fixedRoutes: fixed ? value.fixedRoutes : null,
              shiftStartUtc: fixed ? null : shift.shiftStartUtc,
              shiftDurationSec: fixed ? null : shift.shiftDurationSec,
              breakDurationSec: fixed ? null : shift.breakDurationSec,
              typeLengthOfStay: hasStayType ? value.typeLengthOfStay : null,
              lengthOfStay: stayFixed ? value.lengthOfStay : null,
            }),
          );

    this.submit.submit(request$, () => {
      this.saved.set(true);
      void notify(this.injector, this.id === null ? 'Configuración creada' : 'Configuración guardada');
      void this.router.navigateByUrl('/configuraciones');
    });
  }

  protected vehicleLabel(vehicle: Resource): string {
    return vehicle.licensePlate ? `${vehicle.name} (${vehicle.licensePlate})` : vehicle.name;
  }
}
