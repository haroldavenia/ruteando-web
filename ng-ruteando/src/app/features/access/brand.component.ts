import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Marca de Ruteando: emblema (un cronómetro con tres flechas de ruta, recreado en SVG a partir del logo original)
 * y el nombre como texto real. Los colores salen del tema, así que cambia con el tema claro y oscuro.
 * El emblema es decorativo: los lectores de pantalla solo anuncian el nombre.
 */
@Component({
  selector: 'app-brand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="emblem" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect class="button" x="20" y="1.5" width="8" height="4" rx="1.5" />
      <rect class="button" x="36" y="6" width="6" height="3.2" rx="1.2" transform="rotate(40 39 7.6)" />
      <circle class="face" cx="24" cy="26" r="19" />
      <g class="arrows" transform="translate(0 2)">
        <g id="arrow">
          <path d="M24 11 A13 13 0 0 1 35.26 17.5" />
          <path class="head" d="M37 20.5 L32.66 19 L37.86 16 Z" />
        </g>
        <use href="#arrow" transform="rotate(120 24 24)" />
        <use href="#arrow" transform="rotate(240 24 24)" />
      </g>
    </svg>
    <span class="name">Ruteando</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      color: var(--mat-sys-primary);
    }
    .emblem {
      width: 44px;
      height: 44px;
      flex: none;
    }
    .button {
      fill: currentColor;
    }
    .face {
      fill: color-mix(in srgb, currentColor 14%, transparent);
      stroke: currentColor;
      stroke-width: 3;
    }
    .arrows path {
      fill: none;
      stroke: currentColor;
      stroke-width: 3;
      stroke-linecap: round;
    }
    .arrows .head {
      fill: currentColor;
      stroke-linejoin: round;
      stroke-width: 1.5;
    }
    .name {
      color: var(--mat-sys-on-surface);
      font: 500 1.75rem/1 Roboto, sans-serif;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  `,
})
export class BrandComponent {}
