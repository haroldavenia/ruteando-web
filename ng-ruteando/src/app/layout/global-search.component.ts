import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { CurrentUser } from '../core/auth/current-user';

import { NavItem, quickActionsFor } from './nav-items';

/** Una pantalla o una acción que ofrece la búsqueda. */
export interface SearchOption {
  readonly label: string;
  readonly icon: string;
  readonly link: string;
}

/** Texto sin mayúsculas ni tildes, para buscar «vehiculos» y encontrar «Vehículos». */
function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * Búsqueda de la barra superior: «Buscar o ir a…» con una lista agrupada en «Ir a» (las pantallas que el rol puede abrir) y
 * «Acciones» (planificar una jornada, crear o importar paquetes). Ctrl K (o Cmd K) lleva el foco al campo desde cualquier
 * pantalla; al elegir una opción se va a ella y el campo queda vacío. No consulta el gateway: solo conoce las pantallas del menú.
 */
@Component({
  selector: 'app-global-search',
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatIconModule],
  host: { '(document:keydown)': 'onKeydown($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search" role="search" matAutocompleteOrigin #origin="matAutocompleteOrigin">
      <mat-icon aria-hidden="true">search</mat-icon>
      <input
        #searchInput
        type="search"
        autocomplete="off"
        placeholder="Buscar o ir a…"
        aria-label="Buscar o ir a una pantalla"
        aria-keyshortcuts="Control+K"
        [formControl]="search"
        [matAutocomplete]="results"
        [matAutocompleteConnectedTo]="origin"
      />
      <span class="hint" aria-hidden="true"><kbd>Ctrl</kbd><kbd>K</kbd></span>
    </div>
    <mat-autocomplete #results="matAutocomplete" autoActiveFirstOption [displayWith]="noDisplay" (optionSelected)="go($event.option.value)">
      @for (group of groups(); track group.label) {
        <mat-optgroup [label]="group.label">
          @for (option of group.options; track option.link) {
            <mat-option [value]="option">
              <mat-icon aria-hidden="true">{{ option.icon }}</mat-icon>
              <span>{{ option.label }}</span>
            </mat-option>
          }
        </mat-optgroup>
      } @empty {
        <mat-option disabled>Sin resultados</mat-option>
      }
    </mat-autocomplete>
  `,
  styleUrl: './global-search.component.scss',
})
export class GlobalSearchComponent {
  private readonly router = inject(Router);
  private readonly currentUser = inject(CurrentUser);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  /** Entradas del menú que el rol puede ver: las pantallas a las que se puede ir. */
  readonly items = input.required<readonly NavItem[]>();

  /** Lo escrito y las pantallas y acciones que coinciden, agrupadas (un grupo sin coincidencias no aparece). */
  readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly groups = computed(() => {
    const pages: SearchOption[] = this.items()
      .flatMap((item) => item.children ?? [item])
      .filter((item): item is NavItem & { link: string } => !!item.link)
      .map(({ label, icon, link }) => ({ label, icon, link }));
    const actions: SearchOption[] = quickActionsFor(this.currentUser.role()).map(({ label, icon, link }) => ({ label, icon, link }));
    const text = plain(typeof this.query() === 'string' ? this.query() : '');
    const matches = (options: SearchOption[]) => options.filter((option) => plain(option.label).includes(text));
    return [
      { label: 'Ir a', options: matches(pages) },
      { label: 'Acciones', options: matches(actions) },
    ].filter((group) => group.options.length > 0);
  });

  /** La selección se limpia al elegir: el campo no debe mostrar el objeto. */
  protected readonly noDisplay = (): string => '';

  /** Va a la pantalla o acción elegida y deja el campo vacío y sin foco. */
  go(option: SearchOption): void {
    void this.router.navigateByUrl(option.link);
    this.search.setValue('');
    this.input().nativeElement.blur();
  }

  /** Ctrl K (o Cmd K) lleva el foco al campo y evita el atajo del navegador. */
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.input().nativeElement.focus();
    }
  }
}
