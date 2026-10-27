import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BrandComponent } from '../../shared/brand/brand.component';

import { RouteBackdropComponent } from './route-backdrop.component';

/**
 * Layout de las pantallas de acceso, sin barra ni menú lateral: fondo decorativo de rutas, y una tarjeta centrada con la
 * marca y el contenido enrutado. El tema claro y oscuro es el de toda la aplicación (`styles.scss`); `access-theme` solo acota
 * los estilos comunes de estas pantallas. La tarjeta es de cristal solo si el navegador lo soporta y no se pide más contraste.
 */
@Component({
  selector: 'app-access-layout',
  imports: [RouterOutlet, BrandComponent, RouteBackdropComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="access access-theme">
      <app-route-backdrop />
      <section class="panel">
        <app-brand />
        <p class="tagline">Planifica y sigue tus rutas</p>
        <router-outlet />
      </section>
    </main>
  `,
  styles: `
    .access {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 100vh;
      min-height: 100dvh;
      box-sizing: border-box;
      padding: 24px 16px;
      background: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
    }
    .panel {
      position: relative;
      width: 100%;
      max-width: 440px;
      box-sizing: border-box;
      padding: 32px 28px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 28px;
      background: var(--mat-sys-surface);
      box-shadow:
        0 8px 32px rgb(0 0 0 / 0.14),
        0 2px 6px rgb(0 0 0 / 0.08);
    }
    .tagline {
      margin: 8px 0 24px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    @media (max-width: 400px) {
      .panel {
        padding: 24px 20px;
      }
    }
    @supports (backdrop-filter: blur(1px)) {
      @media (forced-colors: none) and (prefers-contrast: no-preference) {
        .panel {
          background: color-mix(in srgb, var(--mat-sys-surface) 78%, transparent);
          backdrop-filter: blur(14px) saturate(1.2);
        }
      }
    }
  `,
})
export class AccessLayoutComponent {}
