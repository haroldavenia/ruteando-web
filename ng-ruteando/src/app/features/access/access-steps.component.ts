import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Presentación de la pantalla de crear cuenta en el diseño ancho: el camino hasta la primera jornada en tres pasos, unidos por
 * el hilo de la marca. Los números son decorativos (la lista ya dice el orden). Su tarjeta y su título son estilos de
 * `.pitch-card` (`_access-theme.scss`).
 */
@Component({
  selector: 'app-access-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pitch-card' },
  template: `
    <p class="title">Tu primera jornada, en <span class="accent">minutos</span>.</p>
    <ol>
      <li class="now">
        <span class="n" aria-hidden="true">1</span>
        <span><b>Crea tu cuenta</b><small>Tus datos y los de tu empresa</small></span>
      </li>
      <li>
        <span class="n" aria-hidden="true">2</span>
        <span><b>Verifica tu correo</b><small>Abre el enlace que te enviamos</small></span>
      </li>
      <li>
        <span class="n" aria-hidden="true">3</span>
        <span><b>Planifica tu primera jornada</b><small>Lugares, flota y paquetes</small></span>
      </li>
    </ol>
  `,
  styles: `
    ol {
      margin: 24px 0 0;
      padding: 0;
      list-style: none;
    }
    li {
      position: relative;
      display: grid;
      grid-template-columns: 36px 1fr;
      gap: 14px;
      padding-bottom: 20px;
    }
    li:last-child {
      padding-bottom: 0;
    }
    li:not(:last-child)::before {
      position: absolute;
      inset: 38px auto 2px 16.5px;
      width: 3px;
      content: '';
      border-radius: 3px;
      background: var(--mat-sys-outline-variant);
    }
    li.now::before {
      background: var(--app-brand-gradient);
    }
    .n {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      box-sizing: border-box;
      border: 2px solid var(--mat-sys-outline-variant);
      border-radius: 50%;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
    }
    .now .n {
      border-color: transparent;
      background: var(--app-brand-gradient);
      color: var(--mat-sys-on-primary);
    }
    b {
      display: block;
      font: var(--mat-sys-title-small);
    }
    small {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
  `,
})
export class AccessStepsComponent {}
