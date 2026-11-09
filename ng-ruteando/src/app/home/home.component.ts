import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { JourneysApi } from '../core/api/data/journeys.api';
import { PackagesApi } from '../core/api/data/packages.api';
import { Journey } from '../core/api/models';
import { OPERATIONS_ROLES } from '../core/auth/admin-roles';
import { CurrentUser } from '../core/auth/current-user';
import { locale, t } from '../core/i18n/i18n';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { journeyStatusLabel } from '../features/journeys/journey-labels';
import { fetchLatestJourneys } from '../features/journeys/latest-journeys';
import { areaLinksFor } from '../layout/nav-items';
import { CityMapComponent } from '../shared/brand/city-map.component';
import { messageFor } from '../shared/data/api-messages';
import { FormResultComponent } from '../shared/form/form-result.component';
import { formatDateTime } from '../shared/format';
import { ProgressRingComponent } from '../shared/ui/progress-ring.component';
import { SkeletonComponent } from '../shared/ui/skeleton.component';
import { StatusBadgeComponent } from '../shared/ui/status-badge.component';
import { statusTone } from '../shared/ui/status-tone';
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
    FormResultComponent,
    ProgressRingComponent,
    SkeletonComponent,
    CityMapComponent,
    StatusBadgeComponent,
    TranslatePipe,
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
    const salute = hour < 12 ? t('Buenos días') : hour < 20 ? t('Buenas tardes') : t('Buenas noches');
    return `${salute}, ${this.name()}`;
  });
  /** «viernes 30 de octubre» (se muestra en mayúsculas con estilos). */
  protected readonly today = new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date())
    .replace(',', '');
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
        parts.push(
          running === 1
            ? t('1 de las últimas jornadas está en curso')
            : t('{0} de las últimas jornadas están en curso', [running])
        );
      }
    }
    const figures = this.figures();
    if (this.figuresStatus() === 'ready' && figures && figures.pending > 0) {
      const one = figures.pending === 1;
      parts.push(
        figures.exact
          ? one
            ? t('hay 1 paquete esperando ruta')
            : t('hay {0} paquetes esperando ruta', [figures.pending])
          : one
            ? t('hay 1 paquete esperando ruta entre los más recientes')
            : t('hay {0} paquetes esperando ruta entre los más recientes', [figures.pending])
      );
    }
    if (parts.length === 0) {
      return t('Planificación de rutas.');
    }
    const text = parts.join(t(' y '));
    return `${text[0].toUpperCase()}${text.slice(1)}.`;
  });

  /** «98 de 137 paquetes» si son todos; si no, dice que son los más recientes. */
  protected figuresSummary(figures: PackageFigures): string {
    const of = t('{0} de {1} paquetes', [figures.attended, figures.sample]);
    return figures.exact ? of : t('{0} (los más recientes de {1})', [of, figures.total]);
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
      parts.push(journey.totalServices === 1 ? t('1 servicio') : t('{0} servicios', [journey.totalServices]));
    }
    if (typeof journey.totalResources === 'number') {
      parts.push(journey.totalResources === 1 ? t('1 vehículo') : t('{0} vehículos', [journey.totalResources]));
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
