import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Provisional: las pantallas reales de acceso (login, registro, recuperación) son de una fase posterior. */
@Component({
  selector: 'app-access-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Acceso</h1>
    <p>Inicio de sesión: pantalla pendiente.</p>
  `,
})
export class AccessPlaceholderComponent {}
