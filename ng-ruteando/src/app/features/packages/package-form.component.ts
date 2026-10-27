import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MasterDomainsService } from '../../core/api/data/master-domains.service';
import { PackagesApi } from '../../core/api/data/packages.api';
import { Package, PackageInput } from '../../core/api/models';
import { fromGeoJsonPoint, toGeoJsonPoint } from '../../core/geo/lat-lng';
import { RecordLoader } from '../../shared/data/record-loader';
import { SubmitState } from '../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../shared/data/unsaved-changes.guard';
import { FocusFirstInvalidDirective } from '../../shared/form/focus-first-invalid.directive';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { notify } from '../../shared/form/notify';
import { LocationFieldsComponent, createLocationGroup } from '../../shared/map/location-fields.component';

import { DEFAULT_SERVICE_TYPES, serviceTypeLabel } from './package-labels';

const DUPLICATE_GUIDE = 'Ya existe un paquete con ese número de guía';

/** Campos que el gateway calcula o que se cambian por otra vía: no se reenvían al guardar. */
const READ_ONLY_FIELDS: readonly (keyof Package)[] = [
  'id',
  'tenantId',
  'createdAt',
  'updatedAt',
  'status',
  'standardizedAddress',
  'geocodingScore',
  'geocodingStatus',
];

const FIELD_ERRORS: Readonly<Record<string, string>> = {
  required: 'Este campo es obligatorio',
  min: 'El valor no puede ser negativo',
  pieces: 'Escribe un número entero de 1 o más',
};

type FieldName = 'name' | 'serviceType' | 'address' | 'weight' | 'volume' | 'pieceNumber';

function wholePieces(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return value === null || value === '' || (Number.isInteger(value) && value >= 1) ? null : { pieces: true };
}

/**
 * Cuerpo del PUT: el registro cargado sin los campos de solo lectura y con lo editado encima. Así los
 * datos que la pantalla no sabe editar (medidas, ventana horaria, remitente...) no se pierden si el
 * gateway reemplaza el recurso al recibir un PUT.
 */
export function buildUpdateBody(record: Package, edited: Partial<PackageInput>): Partial<PackageInput> {
  const body: Record<string, unknown> = { ...record };
  for (const field of READ_ONLY_FIELDS) {
    delete body[field];
  }
  return { ...body, ...edited } as Partial<PackageInput>;
}

@Component({
  selector: 'app-package-form',
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
  templateUrl: './package-form.component.html',
  styleUrl: './package-form.component.scss',
})
export class PackageFormComponent implements HasUnsavedChanges {
  private readonly api = inject(PackagesApi);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly masters = inject(MasterDomainsService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly isNew = this.id === null;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<Package>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);

  /** Valores del dominio `ServiceType` del gateway o, si aún no hay, los habituales. */
  protected readonly serviceTypes = computed(() => {
    const values = this.masters.values('ServiceType');
    const keys = values.length ? values.map((v) => v.key) : DEFAULT_SERVICE_TYPES;
    return keys.map((key) => ({ key, label: serviceTypeLabel(key) }));
  });

  protected readonly form = new FormGroup({
    guideNumber: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    serviceType: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    city: new FormControl('', { nonNullable: true }),
    country: new FormControl('', { nonNullable: true }),
    postalCode: new FormControl('', { nonNullable: true }),
    location: createLocationGroup(),
    weight: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    volume: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    pieceNumber: new FormControl<number | null>(1, [Validators.required, wholePieces]),
    observation: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.masters.load().subscribe({ error: () => undefined });
    this.loader.load((item) => {
      const point = fromGeoJsonPoint(item.location?.coordinates);
      this.form.reset({
        guideNumber: item.guideNumber ?? '',
        name: item.name,
        serviceType: item.serviceType,
        address: item.address,
        city: item.city ?? '',
        country: item.country ?? '',
        postalCode: item.postalCode ?? '',
        location: { lat: point?.lat ?? null, lng: point?.lng ?? null },
        weight: item.weight,
        volume: item.volume,
        pieceNumber: item.pieceNumber,
        observation: item.observation ?? '',
      });
    });
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
    const location = toGeoJsonPoint({ lat: value.location.lat as number, lng: value.location.lng as number });
    if (!location) {
      return;
    }
    const text = (s: string) => s.trim();
    const required: PackageInput = {
      name: text(value.name),
      serviceType: value.serviceType,
      address: text(value.address),
      location,
      weight: value.weight as number,
      volume: value.volume as number,
    };

    const optional = {
      guideNumber: text(value.guideNumber),
      city: text(value.city),
      country: text(value.country),
      postalCode: text(value.postalCode),
      observation: text(value.observation),
    };
    const pieces = value.pieceNumber as number;

    const request$ =
      this.id === null
        ? // En el alta solo se envía lo que tiene valor: una guía vacía repetida daría 409 en el gateway
          this.api.create({
            ...required,
            ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== '')),
            ...(pieces !== 1 ? { pieceNumber: pieces } : {}),
          })
        : this.api.update(
            this.id,
            buildUpdateBody(this.loader.record() as Package, {
              ...required,
              pieceNumber: pieces,
              guideNumber: optional.guideNumber || null,
              city: optional.city || null,
              country: optional.country || null,
              postalCode: optional.postalCode || null,
              observation: optional.observation || null,
            }),
          );

    this.submit.submit(
      request$,
      () => {
        this.saved.set(true);
        void notify(this.injector, this.id === null ? 'Paquete creado' : 'Paquete guardado');
        void this.router.navigateByUrl('/paquetes');
      },
      { 409: DUPLICATE_GUIDE },
    );
  }
}
