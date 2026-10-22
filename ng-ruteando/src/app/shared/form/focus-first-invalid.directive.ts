import { Directive, ElementRef, inject } from '@angular/core';
import { FormGroupDirective } from '@angular/forms';

/**
 * Tras un envío con el formulario inválido, marca los campos como tocados y da el foco al primer
 * control inválido. Solo actúa en el navegador (en el servidor no hay eventos de envío).
 */
@Directive({
  selector: 'form[formGroup][appFocusFirstInvalid]',
  host: { '(submit)': 'onSubmit()' },
})
export class FocusFirstInvalidDirective {
  private readonly form = inject(FormGroupDirective);
  private readonly host = inject<ElementRef<HTMLFormElement>>(ElementRef);

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.control.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid, select.ng-invalid')?.focus();
    }
  }
}
