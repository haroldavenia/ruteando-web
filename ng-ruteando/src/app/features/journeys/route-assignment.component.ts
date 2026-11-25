import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { ApiError } from '../../core/api/api-error';
import { AssignedServicesApi } from '../../core/api/data/assigned-services.api';
import { isForRoute, readAssignment } from '../../core/api/data/assigned-services-contract';
import { JourneysApi } from '../../core/api/data/journeys.api';
import { ResourcesApi } from '../../core/api/data/resources.api';
import { UsersApi } from '../../core/api/data/users.api';
import { AssignedService } from '../../core/api/models';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DeleteFlow } from '../../shared/data/delete-flow';
import { FormResultComponent } from '../../shared/form/form-result.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';
import { StatusTone, statusTone } from '../../shared/ui/status-tone';
import {
  AssignmentLookups,
  dateLabel,
  driverLabel,
  EMPTY_LOOKUPS,
  loadLookups,
  stateLabel,
  vehicleName,
} from '../assigned-services/assignment-lookups';

/**
 * A quién está asignada una ruta (vehículo, conductor y fecha), con lo necesario para cambiarlo o quitarlo, o para
 * asignarla si todavía no lo está. Los servicios asignados no se pueden pedir por ruta: se pide la lista y se busca.
 */
@Component({
  selector: 'app-route-assignment',
  imports: [FormResultComponent, MatButtonModule, MatIconModule, RouterLink, StatusBadgeComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 id="assignment-title">{{ 'Servicio asignado' | t }}</h2>
    <app-form-result [error]="deleter.error() ?? loadError()" [success]="deleter.success()" />
    @if (loaded()) {
      @if (service(); as current) {
        <dl class="summary stat-grid">
          <div>
            <dt>{{ 'Vehículo' | t }}</dt>
            <dd>{{ vehicle() }}</dd>
          </div>
          <div>
            <dt>{{ 'Conductor' | t }}</dt>
            <dd>{{ driver() }}</dd>
          </div>
          <div>
            <dt>{{ 'Fecha' | t }}</dt>
            <dd>{{ date() }}</dd>
          </div>
          <div>
            <dt>{{ 'Estado' | t }}</dt>
            <dd>
              <app-status-badge [tone]="tone()" [label]="state()" />
            </dd>
          </div>
        </dl>
        <div class="form-actions">
          <a mat-stroked-button [routerLink]="['/assigned-services', current.id]">{{ 'Cambiar' | t }}</a>
          <button mat-stroked-button type="button" (click)="remove(current)">
            <mat-icon aria-hidden="true">delete</mat-icon>{{ 'Quitar asignación' | t }}
          </button>
        </div>
      } @else {
        <p>{{ 'Esta ruta todavía no está asignada a un vehículo y un conductor.' | t }}</p>
        <div class="form-actions">
          <a
            mat-flat-button
            class="primary-action"
            routerLink="/assigned-services/new"
            [queryParams]="{ journey: journeyId(), route: routeIndex() }"
            ><mat-icon aria-hidden="true">task_alt</mat-icon>{{ 'Asignar ruta' | t }}</a
          >
        </div>
      }
    }
  `,
})
export class RouteAssignmentComponent {
  private readonly api = inject(AssignedServicesApi);
  private readonly journeys = inject(JourneysApi);
  private readonly resources = inject(ResourcesApi);
  private readonly users = inject(UsersApi);

  readonly journeyId = input.required<string>();
  readonly routeIndex = input.required<number>();

  protected readonly deleter = new DeleteFlow();
  protected readonly loaded = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly service = signal<AssignedService | null>(null);
  private lookups: AssignmentLookups = EMPTY_LOOKUPS;

  constructor() {
    this.load();
  }

  private load(): void {
    this.api.list().subscribe({
      next: (all) => {
        this.service.set(all.find((s) => isForRoute(s, this.journeyId(), this.routeIndex())) ?? null);
        this.finish();
      },
      error: (err: unknown) => {
        this.loadError.set(err instanceof ApiError ? err.message : t('No se pudo completar la solicitud'));
        this.loaded.set(true);
      },
    });
  }

  /** Con el servicio ya localizado, se piden los nombres de su vehículo y su conductor. */
  private finish(): void {
    if (!this.service()) {
      this.loaded.set(true);
      return;
    }
    loadLookups(this.journeys, this.resources, this.users).subscribe((lookups) => {
      this.lookups = lookups;
      this.loaded.set(true);
    });
  }

  protected vehicle(): string {
    return vehicleName(this.lookups, readAssignment(this.service() as AssignedService).vehicleId);
  }

  protected driver(): string {
    return driverLabel(this.lookups, readAssignment(this.service() as AssignedService).driverId);
  }

  protected date(): string {
    return dateLabel(readAssignment(this.service() as AssignedService).executionDate);
  }

  protected state(): string {
    return stateLabel((this.service() as AssignedService).state);
  }

  protected tone(): StatusTone {
    return statusTone('assigned', (this.service() as AssignedService).state);
  }

  protected remove(service: AssignedService): void {
    this.deleter.run({
      entity: t('servicio asignado'),
      name: t('Ruta {0}', [this.routeIndex() + 1]),
      request: () => this.api.remove(service.id),
      reload: () => {
        this.service.set(null);
      },
    });
  }
}
