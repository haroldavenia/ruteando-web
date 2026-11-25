import { ChangeDetectionStrategy, Component, inject, Injector, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AssignedServicesApi } from '../../core/api/data/assigned-services.api';
import { assignmentBody, readAssignment } from '../../core/api/data/assigned-services-contract';
import { JourneysApi } from '../../core/api/data/journeys.api';
import { ResourcesApi } from '../../core/api/data/resources.api';
import { UsersApi } from '../../core/api/data/users.api';
import { AssignedService, DomainRoute, Resource, User } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { RecordLoader } from '../../shared/data/record-loader';
import { SubmitState } from '../../shared/data/submit-state';
import { HasUnsavedChanges } from '../../shared/data/unsaved-changes.guard';
import { FocusFirstInvalidDirective } from '../../shared/form/focus-first-invalid.directive';
import { FormActionsComponent } from '../../shared/form/form-actions.component';
import { FormHeadComponent } from '../../shared/form/form-head.component';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { notify } from '../../shared/form/notify';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { driverName, vehicleLabel } from '../fleet/fleet-labels';
import { AssignmentLookups, EMPTY_LOOKUPS, loadLookups } from './assignment-lookups';

const REQUIRED = t('Este campo es obligatorio');

/** Hoy en `AAAA-MM-DD` según el reloj local (lo que espera `<input type="date">`). */
function today(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Asignar una ruta de una jornada a un vehículo y un conductor para una fecha. Al elegir la ruta se propone su vehículo
 * y, al elegir el vehículo, su conductor; la persona puede cambiarlos. `?journey=ID&route=N` deja la ruta elegida.
 */
@Component({
  selector: 'app-assigned-service-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    SkeletonComponent,
    FocusFirstInvalidDirective,
    FormActionsComponent,
    FormHeadComponent,
    FormResultComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assigned-service-form.component.html',
  styleUrl: './assigned-service-form.component.scss',
})
export class AssignedServiceFormComponent implements HasUnsavedChanges {
  private readonly api = inject(AssignedServicesApi);
  private readonly journeysApi = inject(JourneysApi);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly snapshot = inject(ActivatedRoute).snapshot;
  private readonly id = this.snapshot.paramMap.get('id');

  protected readonly isNew = this.id === null;
  protected readonly submit = new SubmitState();
  protected readonly loader = new RecordLoader<AssignedService>(this.id, (id) => this.api.get(id));
  private readonly saved = signal(false);

  protected readonly lookups = signal<AssignmentLookups>(EMPTY_LOOKUPS);
  protected readonly lookupsLoaded = signal(false);
  protected readonly routes = signal<readonly DomainRoute[]>([]);
  protected readonly routesLoading = signal(false);

  protected readonly form = new FormGroup({
    journeyId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    routeIndex: new FormControl<number | null>(null, { validators: [Validators.required] }),
    vehicleId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    driverId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    executionDate: new FormControl(today(), { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    loadLookups(this.journeysApi, inject(ResourcesApi), inject(UsersApi)).subscribe((lookups) => {
      this.lookups.set(lookups);
      this.lookupsLoaded.set(true);
    });
    this.loader.load((service) => {
      const refs = readAssignment(service);
      this.form.reset({
        journeyId: refs.journeyId ?? '',
        routeIndex: refs.routeIndex,
        vehicleId: refs.vehicleId ?? '',
        driverId: refs.driverId ?? '',
        executionDate: refs.executionDate ?? today(),
      });
      if (refs.journeyId) {
        this.loadRoutes(refs.journeyId, null);
      }
    });
    const journey = this.snapshot.queryParamMap.get('journey');
    const index = this.snapshot.queryParamMap.get('route');
    if (this.isNew && journey) {
      this.form.controls.journeyId.setValue(journey);
      this.loadRoutes(journey, /^\d+$/.test(index ?? '') ? Number(index) : null);
    }
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
  }

  protected error(name: keyof typeof this.form.controls): string {
    return this.form.controls[name].hasError('required') ? REQUIRED : '';
  }

  protected vehicleText(vehicle: Resource): string {
    return vehicleLabel(vehicle);
  }

  protected driverText(driver: User): string {
    return driverName(driver);
  }

  protected pickJourney(id: string): void {
    this.form.controls.routeIndex.reset(null);
    this.loadRoutes(id, null);
  }

  /** La ruta propone su vehículo (el que planificó el gateway) y este, su conductor. */
  protected pickRoute(routeIndex: number): void {
    const resourceId = this.routes().find((r) => r.routeIndex === routeIndex)?.resourceId;
    if (resourceId) {
      this.form.controls.vehicleId.setValue(resourceId);
      this.pickVehicle(resourceId);
    }
  }

  protected pickVehicle(vehicleId: string): void {
    const driverId = this.lookups().resources.find((r) => r.id === vehicleId)?.driverId;
    if (driverId) {
      this.form.controls.driverId.setValue(driverId);
    }
  }

  /** Trae las rutas de la jornada (el gateway no tiene un endpoint de rutas) y, si se pide, deja una elegida. */
  private loadRoutes(journeyId: string, select: number | null): void {
    this.routesLoading.set(true);
    this.routes.set([]);
    this.journeysApi.get(journeyId).subscribe({
      next: (journey) => {
        this.routes.set(journey.routes);
        this.routesLoading.set(false);
        if (select !== null && journey.routes.some((r) => r.routeIndex === select)) {
          this.form.controls.routeIndex.setValue(select);
          this.pickRoute(select);
        }
      },
      error: () => this.routesLoading.set(false),
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const record = this.loader.record();
    if (this.id !== null && !record) {
      return;
    }
    const { journeyId, routeIndex, vehicleId, driverId, executionDate } = this.form.getRawValue();
    const body = assignmentBody(
      { journeyId, routeIndex: routeIndex as number, vehicleId, driverId, executionDate },
      record?.state
    );
    const request$ = this.id === null ? this.api.create(body) : this.api.update(this.id, body);
    this.submit.submit(request$, () => {
      this.saved.set(true);
      void notify(this.injector, this.id === null ? t('Ruta asignada') : t('Servicio asignado guardado'));
      void this.router.navigateByUrl('/assigned-services');
    });
  }
}
