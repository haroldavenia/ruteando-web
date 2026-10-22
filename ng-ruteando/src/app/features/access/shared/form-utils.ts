import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Longitud mínima de la contraseña que se valida en el cliente (la política real la aplica el gateway). */
export const PASSWORD_MIN_LENGTH = 8;

/** Validador para el campo de confirmación: su valor debe ser igual al del campo hermano `passwordName`. */
export function matchesSibling(passwordName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.parent?.get(passwordName)?.value;
    // Un campo vacío ya lo señala `required`; aquí solo se compara cuando hay algo escrito
    return control.value && password !== control.value ? { mismatch: true } : null;
  };
}

/**
 * Revalida la confirmación cuando cambia la contraseña (el validador del propio campo solo se ejecuta
 * al cambiar la confirmación). Debe llamarse en un contexto de inyección (constructor del componente).
 */
export function revalidateOnPasswordChange(group: FormGroup, passwordName: string, confirmName: string): void {
  const destroyRef = inject(DestroyRef);
  group
    .get(passwordName)
    ?.valueChanges.pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => group.get(confirmName)?.updateValueAndValidity({ emitEvent: false }));
}
