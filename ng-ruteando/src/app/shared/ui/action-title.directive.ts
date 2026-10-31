import { AfterViewChecked, Directive, ElementRef, inject } from '@angular/core';

/**
 * Todo botón de solo icono (`mat-icon-button`) lleva un `title` con lo que hace, para que al pasar el cursor por encima se sepa para
 * qué sirve aunque no haya texto cerca. Copia su `aria-label` (que las pantallas ya dan con el nombre del registro: «Editar lugar
 * Depósito norte»), así los dos dicen lo mismo y no se pueden separar. Si una plantilla pone su propio `title`, se respeta.
 *
 * Se importa en cada componente que declare un botón de icono; lo comprueba `icon-button-titles.ts` en las pruebas de cada pantalla.
 */
@Directive({ selector: '[mat-icon-button]' })
export class ActionTitleDirective implements AfterViewChecked {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Lo último que se copió: distingue un título nuestro (se actualiza con el nombre) de uno puesto a mano (se respeta). */
  private mirrored: string | null = null;

  ngAfterViewChecked(): void {
    const label = this.element.getAttribute('aria-label');
    const title = this.element.getAttribute('title');
    if (!label || (title !== null && title !== this.mirrored)) {
      return;
    }
    if (title !== label) {
      this.element.setAttribute('title', label);
    }
    this.mirrored = label;
  }
}
