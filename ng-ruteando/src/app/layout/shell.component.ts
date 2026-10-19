import { BreakpointObserver } from '@angular/cdk/layout';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatListModule,
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

  readonly items: NavItem[] = [{ label: 'Inicio', icon: 'home', link: '/' }];

  /**
   * true a partir de 960px de ancho: el menú lateral queda fijo.
   * Arranca en true para que servidor y cliente rendericen lo mismo;
   * el breakpoint real se observa solo en el navegador, tras el primer render.
   */
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
}
