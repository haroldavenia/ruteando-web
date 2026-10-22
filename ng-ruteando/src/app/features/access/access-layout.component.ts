import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Layout de las pantallas de acceso: nombre de la aplicación y contenido centrado, sin barra ni menú lateral. */
@Component({
  selector: 'app-access-layout',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="access">
      <section class="panel">
        <p class="brand">Ruteando</p>
        <router-outlet />
      </section>
    </main>
  `,
  styles: `
    .access {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      box-sizing: border-box;
      padding: 24px 16px;
      background: var(--mat-sys-surface-container-low);
    }
    .panel {
      width: 100%;
      max-width: 440px;
      box-sizing: border-box;
      padding: 24px;
      border-radius: 16px;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
    }
    .brand {
      margin: 0 0 16px;
      font: var(--mat-sys-title-large);
      color: var(--mat-sys-primary);
    }
  `,
})
export class AccessLayoutComponent {}
