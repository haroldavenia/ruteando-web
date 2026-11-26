import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, finalize } from 'rxjs';

import { MasterDomainsApi } from '../../core/api/data/master-domains.api';
import { MasterDomainsService } from '../../core/api/data/master-domains.service';
import { MasterDomain, MasterDomainValue } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { messageFor } from '../../shared/data/api-messages';
import { DataColumn, DataTableComponent } from '../../shared/data/data-table.component';
import { LocalListState } from '../../shared/data/local-list-state';
import { RecordLoader } from '../../shared/data/record-loader';
import { SubmitState } from '../../shared/data/submit-state';
import { FocusFirstInvalidDirective } from '../../shared/form/focus-first-invalid.directive';
import { FormHeadComponent } from '../../shared/form/form-head.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { ActionTitleDirective } from '../../shared/ui/action-title.directive';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { valuesText } from './catalog-list.component';

const DUPLICATE_KEY = t('Ya existe un valor con esa clave en este catálogo');
const REQUIRED = t('Este campo es obligatorio');

/** Valores en el orden del catálogo: por `sortOrder` (los sin orden al final) y luego por nombre. */
export function sortValues(values: readonly MasterDomainValue[]): MasterDomainValue[] {
  return [...values].sort(
    (a, b) =>
      (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
      a.label.localeCompare(b.label)
  );
}

/** La clave se usa tal cual en el sistema: sin espacios (regla del cliente por prudencia; el gateway no documenta la suya). */
const keyValidator = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (value === '') {
    return { required: true };
  }
  return /\s/.test(value) ? { spaces: true } : null;
};

const FIELD_ERRORS: Readonly<Record<string, string>> = {
  required: REQUIRED,
  spaces: t('La clave no puede llevar espacios'),
  min: t('Escribe un número entero de 0 en adelante'),
  pattern: t('Escribe un número entero de 0 en adelante'),
};

/**
 * Un catálogo y sus valores: ver, añadir un valor y activarlo o desactivarlo (el gateway no borra valores). El gateway responde
 * con el catálogo completo tras cada cambio; se actualiza también la lectura compartida que llena los selectores.
 */
@Component({
  selector: 'app-catalog-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DataTableComponent,
    FocusFirstInvalidDirective,
    FormHeadComponent,
    FormResultComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    SkeletonComponent,
    ActionTitleDirective,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog-detail.component.html',
})
export class CatalogDetailComponent {
  private readonly api = inject(MasterDomainsApi);
  private readonly domains = inject(MasterDomainsService);
  private readonly dialog = inject(MatDialog);
  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') as string;

  protected readonly loader = new RecordLoader<MasterDomain>(this.code, (code) => this.api.get(code));
  protected readonly values = new LocalListState<MasterDomainValue>();
  protected readonly submit = new SubmitState();
  protected readonly success = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Clave del valor con un cambio en curso. */
  protected readonly busyKey = signal<string | null>(null);

  protected readonly valuesText = valuesText;
  protected readonly rowKey = (value: MasterDomainValue): string => value.key;
  protected readonly columns: DataColumn<MasterDomainValue>[] = [
    { id: 'key', header: t('Clave'), cell: (v) => v.key, kind: 'id' },
    { id: 'label', header: t('Nombre'), cell: (v) => v.label, kind: 'strong' },
    { id: 'description', header: t('Descripción'), cell: (v) => v.description ?? '', kind: 'muted' },
    { id: 'order', header: t('Orden'), cell: (v) => (v.sortOrder === null ? '' : String(v.sortOrder)) },
    {
      id: 'state',
      header: t('Estado'),
      cell: (v) => (v.active ? t('Activo') : t('Inactivo')),
      tone: (v) => (v.active ? 'success' : 'neutral'),
    },
  ];

  protected readonly form = new FormGroup({
    key: new FormControl('', { nonNullable: true, validators: [keyValidator] }),
    label: new FormControl('', {
      nonNullable: true,
      validators: [(c: AbstractControl) => (String(c.value ?? '').trim() === '' ? { required: true } : null)],
    }),
    description: new FormControl('', { nonNullable: true }),
    sortOrder: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^\d*$/)] }),
  });

  constructor() {
    this.loader.load((domain) => this.show(domain));
  }

  protected fieldError(name: keyof typeof this.form.controls): string {
    const errors = this.form.controls[name].errors;
    const key = errors ? Object.keys(errors).find((k) => FIELD_ERRORS[k]) : undefined;
    return key ? FIELD_ERRORS[key] : '';
  }

  protected add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { key, label, description, sortOrder } = this.form.getRawValue();
    const value = {
      key: key.trim(),
      label: label.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(sortOrder !== '' ? { sortOrder: Number(sortOrder) } : {}),
    };
    this.success.set(null);
    this.error.set(null);
    this.submit.submit(
      this.api.addValue(this.code, value),
      (domain) => {
        this.form.reset({ key: '', label: '', description: '', sortOrder: '' });
        this.changed(domain);
        this.success.set(t('Se añadió el valor «{0}»', [value.key]));
      },
      { 409: DUPLICATE_KEY }
    );
  }

  /** Activa un valor; para apagarlo (los selectores dejan de ofrecerlo) pide confirmación. */
  protected toggle(value: MasterDomainValue): void {
    if (this.busyKey() !== null) {
      return;
    }
    this.success.set(null);
    this.error.set(null);
    if (!value.active) {
      this.run(value, t('Se activó el valor «{0}»', [value.key]));
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: t('Desactivar valor'),
          message: t('«{0}» dejará de ofrecerse en los selectores del sistema. Puedes volver a activarlo después.', [
            value.label,
          ]),
          confirmLabel: t('Desactivar'),
        },
      })
      .afterClosed()
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => this.run(value, t('Se desactivó el valor «{0}»', [value.key])));
  }

  private run(value: MasterDomainValue, done: string): void {
    this.busyKey.set(value.key);
    this.api
      .toggleValue(this.code, value.key)
      .pipe(finalize(() => this.busyKey.set(null)))
      .subscribe({
        next: (domain) => {
          this.changed(domain);
          this.success.set(done);
        },
        error: (err: unknown) => this.error.set(messageFor(err)),
      });
  }

  private show(domain: MasterDomain): void {
    this.loader.record.set(domain);
    this.values.set(sortValues(domain.values));
  }

  /** Tras un cambio: pinta el catálogo que respondió el gateway y avisa a los selectores de que sus opciones cambiaron. */
  private changed(domain: MasterDomain): void {
    this.show(domain);
    this.domains.refresh().subscribe({ error: () => undefined });
  }
}
