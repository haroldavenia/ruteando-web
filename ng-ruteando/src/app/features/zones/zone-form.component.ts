import { ChangeDetectionStrategy, Component, Injector, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ZonesApi } from '../../core/api/data/zones.api';
import { Zone, ZoneInput } from '../../core/api/models';
import { LatLng } from '../../core/geo/lat-lng';
import { RecordLoader } from '../../shared/data/record-loader';
import { SubmitState } from '../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../shared/data/unsaved-changes.guard';
import { FocusFirstInvalidDirective } from '../../shared/form/focus-first-invalid.directive';
import { FormActionsComponent } from '../../shared/form/form-actions.component';
import { FormHeadComponent } from '../../shared/form/form-head.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { notify } from '../../shared/form/notify';
import { PolygonEditorComponent } from '../../shared/map/polygon-editor.component';
import { isValidPolygon, polygonIssueMessage, ringFromVertices, validatePolygon, verticesFromRing } from '../../shared/map/polygon-geometry';
import { ROUTE_COLORS, ROUTE_COLOR_NAMES } from '../../shared/map/route-colors';

const DUPLICATE_CODE = 'Ya existe una zona con ese código';
export const MAX_CODE_LENGTH = 20;
const READ_ONLY_FIELDS: readonly (keyof Zone)[] = ['id', 'tenantId', 'createdAt', 'updatedAt'];

/** Código sin espacios, de 1 a 20 caracteres (regla del cliente por prudencia: el gateway no documenta la suya). */
function codeValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (value === '') {
    return { required: true };
  }
  if (/\s/.test(value)) {
    return { spaces: true };
  }
  return value.length > MAX_CODE_LENGTH ? { tooLong: true } : null;
}

const nameValidator = (control: AbstractControl): ValidationErrors | null => (String(control.value ?? '').trim() === '' ? { required: true } : null);

const FIELD_ERRORS: Readonly<Record<string, string>> = {
  required: 'Este campo es obligatorio',
  spaces: 'El código no puede llevar espacios',
  tooLong: `El código admite como máximo ${MAX_CODE_LENGTH} caracteres`,
};

/** Cuerpo del PUT: el registro cargado sin los campos de solo lectura y con lo editado encima (conserva `active`). */
export function buildZoneUpdateBody(record: Zone, edited: Partial<ZoneInput>): Partial<ZoneInput> {
  const body: Record<string, unknown> = { ...record };
  for (const field of READ_ONLY_FIELDS) {
    delete body[field];
  }
  return { ...body, ...edited } as Partial<ZoneInput>;
}

@Component({
  selector: 'app-zone-form',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, FocusFirstInvalidDirective, FormActionsComponent, FormHeadComponent, FormResultComponent, MatIconModule, PolygonEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zone-form.component.html',
  styleUrl: './zone-form.component.scss',
})
export class ZoneFormComponent implements HasUnsavedChanges {
  private readonly api = inject(ZonesApi);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly isNew = this.id === null;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<Zone>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);

  protected readonly vertices = signal<LatLng[]>([]);
  private initialVertices = '[]';
  protected readonly polygonTouched = signal(false);
  protected readonly polygonError = computed(() => {
    const vertices = this.vertices();
    if (!this.polygonTouched()) {
      return '';
    }
    if (vertices.length === 0) {
      return 'Dibuja el polígono de la zona en el mapa o escribe sus vértices';
    }
    const blocking = validatePolygon(vertices).filter((i) => i.kind !== 'unchecked');
    return blocking.map(polygonIssueMessage).join('. ');
  });

  protected readonly colors = [
    { value: null as string | null, label: 'Sin color' },
    ...ROUTE_COLORS.map((value, i) => ({ value: value as string | null, label: ROUTE_COLOR_NAMES[i] })),
  ];

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [nameValidator] }),
    code: new FormControl('', { nonNullable: true, validators: [codeValidator] }),
    color: new FormControl<string | null>(null),
  });

  constructor() {
    this.loader.load((zone) => {
      this.form.reset({ name: zone.name, code: zone.code, color: zone.color ?? null });
      const vertices = verticesFromRing(zone.boundary?.coordinates?.[0]);
      this.initialVertices = JSON.stringify(vertices);
      this.vertices.set(vertices);
    });
  }

  hasUnsavedChanges(): boolean {
    return (this.form.dirty || JSON.stringify(this.vertices()) !== this.initialVertices) && !this.saved();
  }

  protected error(name: 'name' | 'code'): string {
    const errors = this.form.controls[name].errors;
    const key = errors ? Object.keys(errors).find((k) => FIELD_ERRORS[k]) : undefined;
    return key ? FIELD_ERRORS[key] : '';
  }

  protected selectColor(value: string | null): void {
    this.form.controls.color.setValue(value);
    this.form.controls.color.markAsDirty();
  }

  protected save(): void {
    this.polygonTouched.set(true);
    if (this.form.invalid || !isValidPolygon(this.vertices()) || this.vertices().length < 3) {
      return;
    }
    const { name, code, color } = this.form.getRawValue();
    const boundary = { type: 'Polygon' as const, coordinates: [ringFromVertices(this.vertices())] };
    const base: ZoneInput = { name: name.trim(), code: code.trim(), boundary };

    const record = this.loader.record();
    if (this.id !== null && !record) {
      return;
    }
    const request$ =
      this.id === null || !record
        ? this.api.create(color ? { ...base, color } : base)
        : this.api.update(this.id, buildZoneUpdateBody(record, { ...base, color }));

    this.submit.submit(
      request$,
      () => {
        this.saved.set(true);
        void notify(this.injector, this.id === null ? 'Zona creada' : 'Zona guardada');
        void this.router.navigateByUrl('/zonas');
      },
      { 409: DUPLICATE_CODE },
    );
  }
}
