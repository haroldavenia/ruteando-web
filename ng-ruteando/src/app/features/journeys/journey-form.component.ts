import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';

import { JourneysApi } from '../../core/api/data/journeys.api';
import { SettingsApi } from '../../core/api/data/settings.api';
import { Settings } from '../../core/api/models';
import { SubmitState } from '../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../shared/data/unsaved-changes.guard';
import { FocusFirstInvalidDirective } from '../../shared/form/focus-first-invalid.directive';
import { FormActionsComponent } from '../../shared/form/form-actions.component';
import { FormHeadComponent } from '../../shared/form/form-head.component';
import { FormResultComponent } from '../../shared/form/form-result.component';

import { PackagePickerComponent } from './package-picker.component';
import { planErrorMessage } from './plan-errors';

/** Cuántas configuraciones se cargan en el selector; si hay más, el formulario avisa. */
export const SELECT_LIMIT = 200;

@Component({
  selector: 'app-journey-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    FocusFirstInvalidDirective,
    FormActionsComponent,
    FormHeadComponent,
    FormResultComponent,
    PackagePickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journey-form.component.html',
  styleUrl: './journey-form.component.scss',
})
export class JourneyFormComponent implements HasUnsavedChanges {
  private readonly api = inject(JourneysApi);
  private readonly router = inject(Router);

  protected readonly submit = new SubmitState();
  protected readonly selectLimit = SELECT_LIMIT;
  protected readonly settings = signal<readonly Settings[]>([]);
  protected readonly settingsLoaded = signal(false);
  protected readonly settingsTruncated = signal(false);
  protected readonly selectedIds = signal<string[]>([]);
  /** `true` tras un intento de envío sin paquetes, para mostrar el error de la selección. */
  protected readonly selectionTouched = signal(false);
  protected readonly selectionError = computed(() => (this.selectionTouched() && this.selectedIds().length === 0 ? 'Elige al menos un paquete' : ''));
  private readonly saved = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    settingsId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue()), startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  /** Lo que se va a planificar, para el resumen «Revisa»: solo da formato a lo que hay en el formulario. */
  protected readonly review = computed(() => {
    const { name, settingsId } = this.value();
    const count = this.selectedIds().length;
    return {
      name: name.trim() || null,
      settings: this.settings().find((item) => item.id === settingsId)?.description ?? null,
      packages: count === 0 ? null : count === 1 ? '1 paquete' : `${count} paquetes`,
    };
  });

  constructor() {
    inject(SettingsApi)
      .list({ page: 0, size: SELECT_LIMIT })
      .subscribe({
        next: (page) => {
          this.settings.set(page.content);
          this.settingsTruncated.set(page.totalElements > page.content.length);
          this.settingsLoaded.set(true);
        },
        error: () => this.settingsLoaded.set(true),
      });
  }

  hasUnsavedChanges(): boolean {
    return (this.form.dirty || this.selectedIds().length > 0) && !this.saved();
  }

  protected error(name: 'name' | 'settingsId'): string {
    return this.form.controls[name].errors ? 'Este campo es obligatorio' : '';
  }

  protected plan(): void {
    this.selectionTouched.set(true);
    if (this.form.invalid || this.selectedIds().length === 0) {
      return;
    }
    const { name, settingsId } = this.form.getRawValue();
    this.submit.submit(
      this.api.plan({ name: name.trim(), settingsId, packageIds: this.selectedIds() }),
      (journey) => {
        this.saved.set(true);
        void this.router.navigate(['/jornadas', journey.id]);
      },
      {},
      planErrorMessage,
    );
  }
}
