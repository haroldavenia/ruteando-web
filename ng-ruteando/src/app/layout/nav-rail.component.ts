import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { BrandComponent } from '../shared/brand/brand.component';

import { NavItem } from './nav-items';

/**
 * Riel de iconos de las pantallas anchas: la marca arriba y una entrada por área, con su icono sobre su nombre. Una sección con
 * varias entradas (Flota) es un botón que abre un menú con ellas. La entrada activa se distingue con fondo propio, con el hilo
 * de la marca en el borde del riel y con `aria-current`, no solo con el peso de la letra. Un nombre corto (`short`) solo cambia
 * lo que se ve: el nombre accesible sigue siendo el largo.
 */
@Component({
  selector: 'app-nav-rail',
  imports: [BrandComponent, MatIconModule, MatMenuModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="rail" aria-label="Navegación principal">
      <a class="rail-brand" routerLink="/"><app-brand size="mark" /></a>
      <ul class="rail-list">
        @for (item of items(); track item.label) {
          <li>
            @if (item.children; as children) {
              <button
                type="button"
                class="rail-item"
                [class.active]="groupActive(item)"
                [attr.aria-label]="item.short ? item.label : null"
                [matMenuTriggerFor]="group"
              >
                <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
                <span class="rail-label">{{ item.short ?? item.label }}</span>
              </button>
              <mat-menu #group="matMenu" xPosition="after">
                @for (child of children; track child.link) {
                  <a mat-menu-item [routerLink]="child.link" routerLinkActive="active" ariaCurrentWhenActive="page">
                    <mat-icon aria-hidden="true">{{ child.icon }}</mat-icon>
                    <span>{{ child.label }}</span>
                  </a>
                }
              </mat-menu>
            } @else {
              <a
                class="rail-item"
                [routerLink]="item.link"
                routerLinkActive="active"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                [attr.aria-label]="item.short ? item.label : null"
              >
                <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
                <span class="rail-label">{{ item.short ?? item.label }}</span>
              </a>
            }
          </li>
        }
      </ul>
    </nav>
  `,
  styleUrl: './nav-rail.component.scss',
})
export class NavRailComponent {
  private readonly router = inject(Router);

  /** Entradas que el rol puede ver (las que da `navItemsFor`). */
  readonly items = input.required<readonly NavItem[]>();

  /** Dirección actual: al cambiar, se recalcula qué sección está activa. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** La sección (Flota) está activa cuando lo está cualquiera de sus entradas. */
  protected groupActive(item: NavItem): boolean {
    this.url();
    return (item.children ?? []).some((child) =>
      child.link ? this.router.isActive(child.link, { paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }) : false,
    );
  }
}
