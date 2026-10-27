import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { JourneysApi } from '../core/api/data/journeys.api';
import { Journey } from '../core/api/models';
import { OPERATIONS_ROLES } from '../core/auth/admin-roles';
import { CurrentUser } from '../core/auth/current-user';
import { messageFor } from '../shared/data/api-messages';
import { FormResultComponent } from '../shared/form/form-result.component';
import { formatDateTime } from '../shared/format';
import { StatusBadgeComponent } from '../shared/ui/status-badge.component';
import { statusTone } from '../shared/ui/status-tone';
import { journeyStatusLabel } from '../features/journeys/journey-labels';
import { fetchLatestJourneys } from '../features/journeys/latest-journeys';
import { areaLinksFor } from '../layout/nav-items';

/**
 * Inicio: saludo, accesos a las áreas que el rol puede abrir (los mismos del menú lateral) como mosaicos y las últimas
 * jornadas en una tarjeta. El estilo de página, mosaicos y tarjetas es el del sistema de interfaz.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, FormResultComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .greeting {
      margin: -16px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-large);
    }
    .journeys {
      margin: 0 0 16px;
      padding: 0;
      list-style: none;
    }
    .journeys li {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .journeys a {
      flex: 1 1 160px;
      font: var(--mat-sys-title-small);
    }
    .meta {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  template: `
    <h1>Ruteando</h1>
    <p class="greeting">Hola, {{ name() }}. Planificación de rutas.</p>

    <section aria-labelledby="areas-title">
      <h2 id="areas-title">Áreas</h2>
      @if (areas().length === 0) {
        <p>Tu rol no tiene áreas disponibles en la aplicación web.</p>
      } @else {
        <ul class="tile-grid">
          @for (area of areas(); track area.link) {
            <li>
              <a class="area tile" [routerLink]="area.link">
                <div class="tile-icon"><mat-icon aria-hidden="true">{{ area.icon }}</mat-icon></div>
                <span>{{ area.label }}</span>
              </a>
            </li>
          }
        </ul>
      }
    </section>

    @if (showJourneys()) {
      <section class="card" aria-labelledby="journeys-title">
        <h2 id="journeys-title">Últimas jornadas</h2>
        @switch (status()) {
          @case ('loading') {
            <mat-progress-bar mode="indeterminate" aria-label="Cargando las últimas jornadas" />
          }
          @case ('error') {
            <app-form-result [error]="error()" />
            <button mat-stroked-button type="button" (click)="load()">Reintentar</button>
          }
          @case ('ready') {
            @if (journeys().length === 0) {
              <p>Todavía no hay jornadas.</p>
              <a mat-stroked-button routerLink="/jornadas/nueva">Planificar la primera jornada</a>
            } @else {
              <ul class="journeys">
                @for (journey of journeys(); track journey.id) {
                  <li>
                    <a [routerLink]="['/jornadas', journey.id]">{{ journey.name }}</a>
                    <app-status-badge [label]="statusLabel(journey.status)" [tone]="tone(journey.status)" />
                    <span class="meta">{{ dateTime(journey.createdAt) }}</span>
                  </li>
                }
              </ul>
              <a mat-stroked-button routerLink="/jornadas">Ver todas las jornadas</a>
            }
          }
        }
      </section>
    }
  `,
})
export class HomeComponent {
  private readonly currentUser = inject(CurrentUser);

  private readonly api = inject(JourneysApi);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly areas = computed(() => areaLinksFor(this.currentUser.role()));
  /** Cómo se saluda a la persona: su nombre o, sin él, su correo. */
  protected readonly name = computed(() => {
    const user = this.currentUser.user();
    return user?.firstName?.trim() || user?.email || '';
  });
  /** Solo quien puede abrir `/jornadas` ve las últimas jornadas, y solo en el navegador (nunca en el render del servidor). */
  protected readonly showJourneys = computed(() => {
    const role = this.currentUser.role();
    return role !== null && OPERATIONS_ROLES.includes(role) && isPlatformBrowser(this.platformId);
  });

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly journeys = signal<readonly Journey[]>([]);
  protected readonly error = signal<string | null>(null);

  protected readonly statusLabel = journeyStatusLabel;
  protected readonly tone = (status: string) => statusTone('journey', status);
  protected readonly dateTime = formatDateTime;

  private loading: Subscription | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.loading?.unsubscribe());
    if (this.showJourneys()) {
      this.load();
    }
  }

  protected load(): void {
    this.loading?.unsubscribe();
    this.status.set('loading');
    this.error.set(null);
    this.loading = fetchLatestJourneys((params) => this.api.list(params)).subscribe({
      next: (items) => {
        this.journeys.set(items);
        this.status.set('ready');
      },
      error: (err: unknown) => {
        this.error.set(messageFor(err));
        this.status.set('error');
      },
    });
  }
}
