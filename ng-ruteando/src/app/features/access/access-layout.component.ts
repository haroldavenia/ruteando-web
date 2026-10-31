import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Data, RouterOutlet } from '@angular/router';

import { BrandComponent } from '../../shared/brand/brand.component';
import { RouteBackdropComponent } from '../../shared/brand/route-backdrop.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle.component';

import { AccessPitchComponent } from './access-pitch.component';
import { AccessStepsComponent } from './access-steps.component';

/**
 * Layout de las pantallas de acceso, sin barra ni menú lateral. En pantallas estrechas, una tarjeta centrada con la marca y el
 * contenido enrutado sobre la ilustración de rutas; desde 1024px, la ilustración con su presentación queda a la izquierda y el
 * formulario ocupa la columna derecha. La presentación es la del producto o, en la ruta que lo pide con `data: { pitch: 'steps' }`
 * (crear cuenta), los pasos hasta la primera jornada. El selector de tema está arriba a la derecha del formulario. El tema claro y
 * oscuro es el de toda la aplicación (`styles.scss`); `access-theme` solo acota los estilos comunes de estas pantallas. La tarjeta
 * es de cristal solo si el navegador lo soporta y no se pide más contraste.
 */
@Component({
  selector: 'app-access-layout',
  imports: [RouterOutlet, BrandComponent, RouteBackdropComponent, ThemeToggleComponent, AccessPitchComponent, AccessStepsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-layout.component.html',
  styleUrl: './access-layout.component.scss',
})
export class AccessLayoutComponent {
  /** `true` cuando la pantalla activa pide los pasos en lugar de la presentación del producto. */
  protected readonly steps = signal(false);

  protected onActivate(data: Data): void {
    this.steps.set(data['pitch'] === 'steps');
  }
}
