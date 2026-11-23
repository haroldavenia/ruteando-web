/**
 * Los botones de solo icono de `root` que no llevan `title` o cuyo `title` no dice lo mismo que su nombre accesible. Vacío si todos
 * cumplen: así, al pasar el cursor por encima, se sabe para qué sirve cada uno aunque no haya texto cerca. Devuelve el nombre de
 * cada botón que falla, para que el mensaje de la prueba diga cuál es. Los del paginador de Material quedan fuera: traen su propio
 * tooltip (`matTooltip`, con «Página anterior» o «Página siguiente») en lugar de un `title`.
 */
export function iconButtonsWithoutTitle(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('.mat-mdc-icon-button:not(.mat-mdc-paginator-container *)'))
    .filter((button) => {
      const label = button.getAttribute('aria-label');
      const title = button.getAttribute('title');
      return !title || (label !== null && title !== label);
    })
    .map((button) => button.getAttribute('aria-label') ?? button.outerHTML.slice(0, 80));
}
