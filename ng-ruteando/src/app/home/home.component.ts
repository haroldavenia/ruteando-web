import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { JourneysApi } from '../core/api/data/journeys.api';
import { PackagesApi } from '../core/api/data/packages.api';
import { Journey } from '../core/api/models';
import { OPERATIONS_ROLES } from '../core/auth/admin-roles';
import { CurrentUser } from '../core/auth/current-user';
import { messageFor } from '../shared/data/api-messages';
import { CityMapComponent } from '../shared/brand/city-map.component';
import { FormResultComponent } from '../shared/form/form-result.component';
import { formatDateTime } from '../shared/format';
import { ProgressRingComponent } from '../shared/ui/progress-ring.component';
import { StatusBadgeComponent } from '../shared/ui/status-badge.component';
import { statusTone } from '../shared/ui/status-tone';
import { journeyStatusLabel } from '../features/journeys/journey-labels';
import { fetchLatestJourneys } from '../features/journeys/latest-journeys';
import { areaLinksFor } from '../layout/nav-items';

import { FIGURES_SAMPLE_SIZE, PackageFigures, packageFigures } from './package-figures';

/**
 * Inicio: cabecera con el saludo y las acciones principales (planificar una jornada e importar paquetes, solo para quienes
 * operan jornadas), accesos a las áreas que el rol puede abrir (los mismos del menú lateral) como mosaicos y las últimas
 * jornadas en una tarjeta. El estilo de página, mosaicos y tarjetas es el del sistema de interfaz.
 */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    FormResultComponent,
    ProgressRingComponent,
    CityMapComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly currentUser = inject(CurrentUser);

  private readonly api = inject(JourneysApi);
  private readonly packagesApi = inject(PackagesApi);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly areas = computed(() => areaLinksFor(this.currentUser.role()));
  /** Cómo se saluda a la persona: su nombre o, sin él, su correo. */
  protected readonly name = computed(() => {
    const user = this.currentUser.user();
    return user?.firstName?.trim() || user?.email || '';
  });
  /** Saludo según la hora: «Buenos días», «Buenas tardes» o «Buenas noches», con el nombre. */
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const salute = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    return `${salute}, ${this.name()}`;
  });
  /** «viernes 30 de octubre» (se muestra en mayúsculas con estilos). */
  protected readonly today = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).replace(',', '');
  /** Quien puede abrir `/jornadas` y `/paquetes` (administradores y agentes) ve las acciones principales. */
  protected readonly canOperate = computed(() => {
    const role = this.currentUser.role();
    return role !== null && OPERATIONS_ROLES.includes(role);
  });
  /** Las últimas jornadas se piden solo a quien opera jornadas, y solo en el navegador (nunca en el render del servidor). */
  protected readonly showJourneys = computed(() => this.canOperate() && isPlatformBrowser(this.platformId));

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly journeys = signal<readonly Journey[]>([]);
  protected readonly error = signal<string | null>(null);

  /** Cifras de paquetes (atendidos, pendientes, sin atender), de la misma página de los más recientes; solo para quien opera. */
  protected readonly figures = signal<PackageFigures | null>(null);
  protected readonly figuresStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly figuresError = signal<string | null>(null);

  protected readonly statusLabel = journeyStatusLabel;
  protected readonly tone = (status: string) => statusTone('journey', status);

  private loading: Subscription | null = null;
  private loadingFigures: Subscription | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.loading?.unsubscribe();
      this.loadingFigures?.unsubscribe();
    });
    if (this.showJourneys()) {
      this.load();
      this.loadFigures();
    }
  }

  /**
   * Resumen bajo el saludo con lo que ya se sabe, sin pedir nada más: las jornadas en curso entre las últimas que se muestran y los
   * paquetes pendientes de las cifras (si son solo los más recientes, lo dice). Sin datos, la frase de siempre.
   */
  protected readonly summary = computed(() => {
    const parts: string[] = [];
    if (this.status() === 'ready') {
      const running = this.journeys().filter((journey) => journey.status === 'in_progress').length;
      if (running > 0) {
        parts.push(`${running} de las últimas jornadas ${running === 1 ? 'está' : 'están'} en curso`);
      }
    }
    const figures = this.figures();
    if (this.figuresStatus() === 'ready' && figures && figures.pending > 0) {
      const noun = figures.pending === 1 ? 'paquete esperando' : 'paquetes esperando';
      parts.push(`hay ${figures.pending} ${noun} ruta${figures.exact ? '' : ' entre los más recientes'}`);
    }
    if (parts.length === 0) {
      return 'Planificación de rutas.';
    }
    const text = parts.join(' y ');
    return `${text[0].toUpperCase()}${text.slice(1)}.`;
  });

  /** «98 de 137 paquetes» si son todos; si no, dice que son los más recientes. */
  protected figuresSummary(figures: PackageFigures): string {
    const of = `${figures.attended} de ${figures.sample} paquetes`;
    return figures.exact ? of : `${of} (los más recientes de ${figures.total})`;
  }

  protected loadFigures(): void {
    this.loadingFigures?.unsubscribe();
    this.figuresStatus.set('loading');
    this.figuresError.set(null);
    this.loadingFigures = this.packagesApi.list({ page: 0, size: FIGURES_SAMPLE_SIZE }).subscribe({
      next: (page) => {
        this.figures.set(packageFigures(page));
        this.figuresStatus.set('ready');
      },
      error: (err: unknown) => {
        this.figuresError.set(messageFor(err));
        this.figuresStatus.set('error');
      },
    });
  }

  /** Servicios y vehículos (si el gateway los informa en el listado) y fecha de creación, en una línea. */
  protected details(journey: Journey): string {
    const parts: string[] = [];
    if (typeof journey.totalServices === 'number') {
      parts.push(`${journey.totalServices} ${journey.totalServices === 1 ? 'servicio' : 'servicios'}`);
    }
    if (typeof journey.totalResources === 'number') {
      parts.push(`${journey.totalResources} ${journey.totalResources === 1 ? 'vehículo' : 'vehículos'}`);
    }
    parts.push(formatDateTime(journey.createdAt));
    return parts.join(' · ');
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
