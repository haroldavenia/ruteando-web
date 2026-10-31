import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Navegación entre los tres listados de la flota (vehículos, tipos de vehículo y conductores). Son enlaces a rutas, no
 * pestañas de un mismo panel: la actual lleva `aria-current="page"`. Las rutas y los permisos no cambian.
 */
@Component({
  selector: 'app-fleet-tabs',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    /* La línea es del componente y la barra la tapa 1px con la de la pestaña actual: así los enlaces no desbordan y no sale un desplazamiento vertical */
    :host {
      display: block;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: -1px;
      overflow-x: auto;
      overflow-y: hidden;
    }
    /* En pantallas estrechas las tres secciones se reparten el ancho (el nombre largo pasa a dos líneas) y caben sin desplazar la barra */
    a {
      display: inline-flex;
      flex: 1 1 auto;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 4px 8px;
      text-align: center;
      border-bottom: 3px solid transparent;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-title-small);
      font-weight: 600;
      text-decoration: none;
    }
    @media (min-width: 480px) {
      a {
        flex: none;
        padding: 0 16px;
      }
    }
    a:hover {
      background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
    }
    a.active {
      border-bottom-color: var(--mat-sys-primary);
      color: var(--mat-sys-primary);
    }
    a:focus-visible {
      outline: 3px solid var(--mat-sys-primary);
      outline-offset: -3px;
    }
  `,
  template: `
    <nav aria-label="Secciones de la flota">
      <a routerLink="/flota/vehiculos" routerLinkActive="active" ariaCurrentWhenActive="page">Vehículos</a>
      <a routerLink="/flota/tipos" routerLinkActive="active" ariaCurrentWhenActive="page">Tipos de vehículo</a>
      <a routerLink="/flota/conductores" routerLinkActive="active" ariaCurrentWhenActive="page">Conductores</a>
    </nav>
  `,
})
export class FleetTabsComponent {}
