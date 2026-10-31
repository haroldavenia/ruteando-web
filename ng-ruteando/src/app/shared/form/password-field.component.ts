import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { map, startWith, switchMap } from 'rxjs';

import { PASSWORD_REQUIREMENTS, missingRules } from '../../core/auth/password-policy';
import { ActionTitleDirective } from '../ui/action-title.directive';
import { FieldMessages, firstErrorMessage } from './access.messages';

let nextId = 0;

/**
 * Campo de contraseña con botón para mostrarla u ocultarla y mensajes de error en español. Con `requirements`
 * añade la lista de requisitos de la política, que se marca punto por punto al escribir.
 */
@Component({
  selector: 'app-password-field',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, ActionTitleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.open]': 'open()', '[class.has-list]': 'requirements()' },
  template: `
    <mat-form-field class="field" [subscriptSizing]="requirements() ? 'dynamic' : 'fixed'">
      <mat-label>{{ label() }}</mat-label>
      @if (leadingIcon(); as icon) {
        <mat-icon matPrefix aria-hidden="true">{{ icon }}</mat-icon>
      }
      <input
        matInput
        [type]="visible() ? 'text' : 'password'"
        [formControl]="control()"
        [attr.autocomplete]="autocomplete()"
        [aria-describedby]="requirements() ? listId : ''"
        (focus)="focused.set(true)"
        (blur)="focused.set(false)"
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
    @if (requirements()) {
      <!-- La barra repite lo que dicen las etiquetas, que son las que anuncian los lectores de pantalla -->
      @if (open()) {
        <div class="strength" aria-hidden="true">
          @for (segment of segments; track segment) {
            <i [class.on]="segment < metCount()"></i>
          }
        </div>
      }
      <!-- Cerrada sigue en el DOM, oculta solo a la vista: el campo la tiene como descripción para los lectores de pantalla -->
      <ul class="requirements" [id]="listId" [class.visually-hidden]="!open()">
        @for (item of items(); track item.rule) {
          <li [class.met]="item.met" [class.failed]="item.failed">
            <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
            <span class="visually-hidden">, {{ item.status }}.</span>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .field {
      width: 100%;
    }
    /* Con la lista, el tamaño del pie es dinámico y se pierde el hueco que los demás campos reservan bajo el input: se devuelve para mantener el ritmo */
    :host(.has-list) .field {
      margin-bottom: 20px;
    }
    :host(.open) .field {
      margin-bottom: 4px;
    }
    /* Barra de seguridad: un tramo por requisito cumplido, con el hilo de la marca */
    .strength {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
      margin-bottom: 10px;
    }
    .strength i {
      height: 4px;
      border-radius: 4px;
      background: var(--mat-sys-surface-container-highest);
    }
    .strength i.on {
      background: var(--app-brand-gradient);
    }
    /* Requisitos como etiquetas: cada una lleva icono y texto, y el color nunca es la única señal */
    .requirements {
      list-style: none;
      margin: 0 0 20px;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 8px;
      font: var(--mat-sys-label-large);
    }
    li {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-height: 28px;
      padding: 2px 12px 2px 8px;
      border-radius: 999px;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface-variant);
    }
    /* Solo el icono de las etiquetas: el del campo (el candado) conserva el tamaño de Material */
    li mat-icon {
      flex: none;
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    li.met {
      background: var(--app-success-container);
      color: var(--app-on-success-container);
    }
    /* El contenedor de error mezclado con la superficie: en oscuro el rojo puro de varias etiquetas a la vez pesa demasiado, y el contraste con su texto solo mejora */
    li.failed {
      background: color-mix(in srgb, var(--mat-sys-error-container) 60%, var(--mat-sys-surface));
      color: var(--mat-sys-on-error-container);
    }
  `,
})
export class PasswordFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly label = input.required<string>();
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  /** Mensajes propios por tipo de error (se suman a los comunes). */
  readonly messages = input<FieldMessages>({});
  /** Muestra la lista de requisitos de la política de contraseña bajo el campo. */
  readonly requirements = input(false);
  /** Icono (de Material) a la izquierda del campo; sin él, el campo no lleva ninguno. */
  readonly leadingIcon = input<string | null>(null);

  protected readonly segments = [0, 1, 2, 3, 4];

  protected readonly listId = `password-requirements-${nextId++}`;
  protected readonly visible = signal(false);
  protected readonly focused = signal(false);

  // Valor y estado «tocado» del control, que cambian sin que lo sepa una vista OnPush
  private readonly state = toSignal(
    toObservable(this.control).pipe(
      switchMap((control) => control.events.pipe(startWith(null), map(() => ({ value: control.value, touched: control.touched })))),
    ),
    { initialValue: { value: '', touched: false } },
  );
  private readonly missing = computed(() => missingRules(this.state().value));

  /** Visible al enfocar y, una vez tocado el campo, mientras falte algún requisito (así tras un envío fallido se ve cuál). */
  protected readonly open = computed(
    () => this.requirements() && (this.focused() || (this.state().touched && Object.keys(this.missing()).length > 0)),
  );

  /** Cuántos requisitos cumple la contraseña escrita. */
  protected readonly metCount = computed(() => PASSWORD_REQUIREMENTS.length - Object.keys(this.missing()).length);

  protected readonly items = computed(() => {
    const missing = this.missing();
    const touched = this.state().touched;
    return PASSWORD_REQUIREMENTS.map(({ rule, label }) => {
      const met = !missing[rule];
      const failed = !met && touched;
      return {
        rule,
        label,
        met,
        failed,
        icon: met ? 'check_circle' : failed ? 'cancel' : 'radio_button_unchecked',
        status: met ? 'cumplido' : failed ? 'no cumplido' : 'pendiente',
      };
    });
  });

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
