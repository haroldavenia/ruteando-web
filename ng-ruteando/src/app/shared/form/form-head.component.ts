import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/**
 * Cabecera de un formulario de alta o edición: el botón de vuelta al listado (un enlace con aspecto de botón de contorno, sin fondo,
 * de 44px) sobre el título `h1`. El estilo del botón es el de Material por tokens y el del título es el del sistema de interfaz
 * (`.page h1`).
 */
@Component({
  selector: 'app-form-head',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <a mat-stroked-button class="back" [routerLink]="backLink()"><mat-icon aria-hidden="true" fontIcon="arrow_back" />{{ backLabel() }}</a>
      <h1>{{ title() }}</h1>
    </div>
  `,
})
export class FormHeadComponent {
  readonly title = input.required<string>();
  /** Nombre del listado al que se vuelve («Lugares»). */
  readonly backLabel = input.required<string>();
  readonly backLink = input.required<string>();
}
