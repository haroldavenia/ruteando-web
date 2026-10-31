import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';


import { AuditFilters, AuditRange, NO_PERSON, addDays, dayKey, hasActiveFilters, startOfDay } from './audit-filters';
import { AUDIT_KINDS, AuditKind, auditKindLabel, shortId } from './audit-labels';

const RANGES: readonly { value: AuditRange; label: string }[] = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'todo', label: 'Todo' },
  { value: 'personalizado', label: 'Personalizado' },
];

/** Valores de las listas desplegables que significan «sin filtro». */
const ALL = 'todos';

/**
 * Filtros del listado de auditoría que la tabla no tiene: rango de fechas, tipo de acción, persona y «solo con cambios». No
 * guarda estado de filtros: recibe los actuales y avisa de lo que cambia (la pantalla lo escribe en la dirección). También lleva el
 * interruptor de los datos técnicos, que es de presentación y no filtra nada.
 */
@Component({
  selector: 'app-audit-filters',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit-filters-bar.component.html',
  styleUrl: './audit-filters-bar.component.scss',
})
export class AuditFiltersBarComponent {
  readonly filters = input.required<AuditFilters>();
  /** Correos que aparecen en los eventos, para elegir una persona. */
  readonly people = input<readonly string[]>([]);
  /** Hay eventos sin correo: se ofrece «Sin identificar». */
  readonly hasUnidentified = input(false);
  readonly technical = input(false);
  /** «Persona» solo tiene sentido si los eventos pueden ser de varias personas (no en «Mi actividad»). */
  readonly showPeople = input(true);
  /** Nombre del tipo de la entidad filtrada, para la etiqueta que se puede quitar. */
  readonly entityLabel = input<string | null>(null);

  readonly filtersChange = output<Partial<AuditFilters>>();
  readonly technicalChange = output<boolean>();
  readonly cleared = output<void>();

  protected readonly ranges = RANGES;
  protected readonly kinds = AUDIT_KINDS;
  protected readonly kindLabel = auditKindLabel;
  protected readonly noPerson = NO_PERSON;
  protected readonly all = ALL;

  /** «Personalizado» elegido sin fechas todavía: abre los campos aunque la dirección aún no lleve el rango. */
  private readonly customOpen = signal(false);
  protected readonly rangeError = signal<string | null>(null);

  protected readonly showCustom = computed(() => this.customOpen() || this.filters().range === 'personalizado');
  protected readonly rangeChoice = computed<AuditRange>(() => (this.showCustom() ? 'personalizado' : this.filters().range));
  protected readonly active = computed(() => hasActiveFilters(this.filters()));
  protected readonly entityShort = computed(() => shortId(this.filters().entityId ?? ''));

  protected pickRange(range: AuditRange): void {
    this.rangeError.set(null);
    if (range === 'personalizado') {
      this.customOpen.set(true);
      const { from, to } = this.filters();
      if (!from && !to) {
        // Se abre ya aplicado (los últimos siete días) para que se vea cómo funciona y baste con ajustar las fechas
        const today = startOfDay(Date.now());
        this.filtersChange.emit({ range: 'personalizado', from: dayKey(addDays(today, -6)), to: dayKey(today) });
      }
      return;
    }
    this.customOpen.set(false);
    this.filtersChange.emit({ range, from: null, to: null });
  }

  protected setDay(edge: 'from' | 'to', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const filters = this.filters();
    const from = edge === 'from' ? value || null : filters.from;
    const to = edge === 'to' ? value || null : filters.to;
    if (from && to && from > to) {
      this.rangeError.set(edge === 'from' ? 'El inicio no puede ser posterior al fin' : 'El fin no puede ser anterior al inicio');
      return;
    }
    this.rangeError.set(null);
    this.filtersChange.emit(from || to ? { range: 'personalizado', from, to } : { range: 'todo', from: null, to: null });
  }

  protected pickKind(value: string): void {
    this.filtersChange.emit({ kind: value === ALL ? null : (value as AuditKind) });
  }

  protected pickPerson(value: string): void {
    this.filtersChange.emit({ person: value === ALL ? null : value });
  }
}
