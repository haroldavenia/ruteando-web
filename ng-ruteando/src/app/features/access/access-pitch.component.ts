import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Presentación del producto que acompaña a la ilustración en el diseño ancho de las pantallas de acceso (desde 1024px; en
 * pantallas estrechas no se muestra). Su tarjeta, el título y la palabra con degradado son estilos de `.pitch-card`
 * (`_access-theme.scss`), compartidos con `AccessStepsComponent`.
 */
@Component({
  selector: 'app-access-pitch',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pitch-card' },
  template: `
    <p class="title">Planifica y sigue tus <span class="accent">rutas</span>.</p>
    <ul>
      <li><span class="icon"><mat-icon aria-hidden="true">route</mat-icon></span>Rutas y paradas en un solo mapa</li>
      <li><span class="icon"><mat-icon aria-hidden="true">task_alt</mat-icon></span>Seguimiento de cada visita</li>
      <li><span class="icon"><mat-icon aria-hidden="true">local_shipping</mat-icon></span>Flota, lugares y zonas a mano</li>
    </ul>
  `,
  styles: `
    ul {
      display: grid;
      gap: 12px;
      margin: 20px 0 0;
      padding: 0;
      list-style: none;
      font: var(--mat-sys-body-large);
    }
    li {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .icon {
      display: grid;
      flex: none;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
  `,
})
export class AccessPitchComponent {}
