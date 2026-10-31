import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { CurrentUser } from '../core/auth/current-user';
import { BrandComponent } from '../shared/brand/brand.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { ThemeToggleComponent } from '../shared/ui/theme-toggle.component';
import { ActionTitleDirective } from '../shared/ui/action-title.directive';

import { GlobalSearchComponent } from './global-search.component';
import { NavRailComponent } from './nav-rail.component';
import { navItemsFor } from './nav-items';

@Component({
  selector: 'app-shell',
  imports: [
    BrandComponent,
    GlobalSearchComponent,
    NavRailComponent,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeToggleComponent,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    ActionTitleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUser = inject(CurrentUser);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly userMenuTrigger = viewChild.required<MatMenuTrigger>('userMenuTrigger');
  /** El menú desplegable de pantallas estrechas; en las anchas no existe (hay riel de iconos). */
  protected readonly drawer = viewChild(MatSidenav);

  /** Entradas que el rol de la persona con sesión puede ver. El menú es una comodidad: la seguridad la dan las guardas y el gateway. */
  readonly items = computed(() => navItemsFor(this.currentUser.role()));

  /** Dirección actual, para marcar la sección de Flota y poner el título de la barra. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Nombre de la persona con sesión, o su correo si no tiene nombre. */
  readonly displayName = computed(() => {
    const user = this.currentUser.user();
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    return name || user?.email || '';
  });
  readonly email = computed(() => this.currentUser.user()?.email ?? '');
  /** Iniciales para el avatar: nombre y apellido o, sin ellos, la primera letra del correo. */
  readonly initials = computed(() => {
    const user = this.currentUser.user();
    const letters = [user?.firstName, user?.lastName]
      .filter((part): part is string => !!part?.trim())
      .map((part) => part.trim()[0]);
    return (letters.length ? letters.slice(0, 2).join('') : (user?.email?.[0] ?? '?')).toUpperCase();
  });

  /**
   * true a partir de 960px de ancho: riel de iconos fijo y búsqueda en la barra; por debajo, menú desplegable.
   * Arranca en true para que servidor y cliente rendericen lo mismo;
   * el breakpoint real se observa solo en el navegador, tras el primer render.
   */
  readonly isWide = signal(true);

  /** Nombre de la pantalla actual (la entrada del menú cuya ruta contiene la dirección), para la barra superior. */
  readonly pageTitle = computed(() => {
    const url = this.url().split(/[?#]/)[0];
    if (url === '/sin-permiso') {
      return 'Sin permiso';
    }
    const flat = this.items().flatMap((item) => item.children ?? [item]);
    const match = flat.find((item) => item.link === '/' ? url === '/' : url === item.link || url.startsWith(`${item.link}/`));
    return match?.label ?? '';
  });

  constructor() {
    afterNextRender(() => {
      const sub = this.breakpoints
        .observe('(min-width: 960px)')
        .subscribe((state) => this.isWide.set(state.matches));
      this.destroyRef.onDestroy(() => sub.unsubscribe());
    });
  }

  /** Pide confirmación antes de cerrar la sesión; al cancelar el foco vuelve al botón de cuenta. */
  confirmLogout(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title: 'Cerrar sesión', message: '¿Quieres cerrar la sesión?', confirmLabel: 'Cerrar sesión' },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed === true) {
          this.auth.logout().subscribe();
        } else {
          this.userMenuTrigger().focus();
        }
      });
  }
}
