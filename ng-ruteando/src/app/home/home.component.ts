import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { CurrentUser } from '../core/auth/current-user';
import { areaLinksFor } from '../layout/nav-items';

/** Inicio: accesos a las áreas que el rol puede abrir (los mismos del menú lateral). */
@Component({
  selector: 'app-home',
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
    h1 {
      margin: 0 0 8px;
      font: var(--mat-sys-headline-small);
    }
    h2 {
      margin: 24px 0 8px;
      font: var(--mat-sys-title-medium);
    }
    .areas {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .area {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 16px;
      color: var(--mat-sys-on-surface);
      text-decoration: none;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-medium, 12px);
    }
    .area:hover {
      background: var(--mat-sys-surface-container);
    }
    .area:focus-visible {
      outline: 3px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }
  `,
  template: `
    <h1>Ruteando</h1>
    <p>Planificación de rutas.</p>

    <section aria-labelledby="areas-title">
      <h2 id="areas-title">Áreas</h2>
      @if (areas().length === 0) {
        <p>Tu rol no tiene áreas disponibles en la aplicación web.</p>
      } @else {
        <ul class="areas">
          @for (area of areas(); track area.link) {
            <li>
              <a class="area" [routerLink]="area.link">
                <mat-icon aria-hidden="true">{{ area.icon }}</mat-icon>
                <span>{{ area.label }}</span>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class HomeComponent {
  private readonly currentUser = inject(CurrentUser);

  protected readonly areas = computed(() => areaLinksFor(this.currentUser.role()));
}
