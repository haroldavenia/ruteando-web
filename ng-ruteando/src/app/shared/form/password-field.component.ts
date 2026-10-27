import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { FieldMessages, firstErrorMessage } from './access.messages';

/** Campo de contraseña con botón para mostrarla u ocultarla y mensajes de error en español. */
@Component({
  selector: 'app-password-field',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="field">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [type]="visible() ? 'text' : 'password'"
        [formControl]="control()"
        [attr.autocomplete]="autocomplete()"
      />
      <button
        mat-icon-button
        matSuffix
        type="button"
        [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        [attr.aria-pressed]="visible()"
        (click)="toggle($event)"
      >
        <mat-icon aria-hidden="true">{{ visible() ? 'visibility_off' : 'visibility' }}</mat-icon>
      </button>
      <mat-error>{{ errorText() }}</mat-error>
    </mat-form-field>
  `,
  styles: `
    :host {
      display: block;
    }
    .field {
      width: 100%;
    }
  `,
})
export class PasswordFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly label = input.required<string>();
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  /** Mensajes propios por tipo de error (se suman a los comunes). */
  readonly messages = input<FieldMessages>({});

  protected readonly visible = signal(false);

  /**
   * Alterna la visibilidad sin perder el foco: el contenedor del campo de Material enfoca el `input` ante
   * cualquier clic dentro de él, y entonces una pulsación posterior de Espacio se escribiría en la contraseña.
   */
  protected toggle(event: Event): void {
    event.stopPropagation();
    this.visible.update((visible) => !visible);
  }

  protected errorText(): string {
    return firstErrorMessage(this.control().errors, this.messages());
  }
}
