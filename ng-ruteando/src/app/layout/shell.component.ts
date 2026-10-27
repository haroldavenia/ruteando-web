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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { CurrentUser } from '../core/auth/current-user';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';

import { navItemsFor } from './nav-items';

@Component({
  selector: 'app-shell',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
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
  private readonly menuTrigger = viewChild.required(MatMenuTrigger);

  /** Entradas que el rol de la persona con sesión puede ver. El menú es una comodidad: la seguridad la dan las guardas y el gateway. */
  readonly items = computed(() => navItemsFor(this.currentUser.role()));

  /**
   * true a partir de 960px de ancho: el menú lateral queda fijo.
   * Arranca en true para que servidor y cliente rendericen lo mismo;
   * el breakpoint real se observa solo en el navegador, tras el primer render.
   */
  /** Nombre de la persona con sesión, o su correo si no tiene nombre. */
  readonly displayName = computed(() => {
    const user = this.currentUser.user();
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    return name || user?.email || '';
  });
  readonly email = computed(() => this.currentUser.user()?.email ?? '');

  readonly isWide = signal(true);
  readonly mode = computed(() => (this.isWide() ? 'side' : 'over'));

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
          this.menuTrigger().focus();
        }
      });
  }
}
