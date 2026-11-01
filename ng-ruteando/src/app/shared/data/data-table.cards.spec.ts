import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { OUTLINED_FIELDS_PROVIDER } from '../form/outlined-fields';

import { DataColumn, DataTableComponent } from './data-table.component';
import { FullListState } from './full-list-state';

interface Item {
  id: string;
  name: string;
}

const ITEMS: Item[] = [
  { id: 'a', name: 'Uno' },
  { id: 'b', name: 'Dos' },
  { id: 'c', name: 'Tres' },
];

@Component({
  imports: [DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-data-table [state]="state" [columns]="columns" [selectable]="selectable" entityPlural="cosas">
      <ng-template #card let-row let-selectable="selectable" let-selected="selected" let-toggle="toggle">
        <article class="cosa" [class.elegida]="selected" [attr.data-selectable]="selectable">
          <button type="button" class="elegir" (click)="toggle(row)">Elegir {{ row.name }}</button>
        </article>
      </ng-template>
      <ng-template #selectionActions let-rows let-clear="clear">
        <button type="button" class="limpiar" (click)="clear()">Limpiar {{ rows.length }}</button>
      </ng-template>
    </app-data-table>
  `,
})
class HostComponent {
  selectable = true;
  readonly columns: DataColumn<Item>[] = [{ id: 'name', header: 'Nombre', cell: (i) => i.name }];
  readonly state = new FullListState<Item>(() => of({ content: ITEMS, page: 0, size: 100, totalElements: ITEMS.length, totalPages: 1 }));
}

/** El contexto de la plantilla `#card`: cada tarjeta sabe si su tabla es elegible, si está elegida y cómo elegirla. */
describe('DataTableComponent: tarjetas con selección', () => {
  let fixture: ComponentFixture<HostComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const cards = () => Array.from(root().querySelectorAll('article.cosa')) as HTMLElement[];

  async function render(selectable: boolean): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.selectable = selectable;
    fixture.componentInstance.state.load();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    // La vista (tarjetas o tabla) se recuerda: se parte siempre de la de tarjetas
    localStorage.removeItem('ruteando-list-view');
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations(), provideRouter([]), OUTLINED_FIELDS_PROVIDER] });
  });

  afterEach(() => localStorage.removeItem('ruteando-list-view'));

  it('cada tarjeta recibe si la tabla es elegible', async () => {
    await render(true);
    expect(cards().length).toBe(3);
    expect(cards()[0].dataset['selectable']).toBe('true');
  });

  it('sin selección las tarjetas lo saben y no hay barra', async () => {
    await render(false);
    expect(cards()[0].dataset['selectable']).toBe('false');
    expect(root().querySelector('.selbar')).toBeNull();
  });

  it('elegir una tarjeta la marca y muestra la barra con cuántas hay; elegirla otra vez la quita', async () => {
    await render(true);
    const pick = (i: number) => {
      (cards()[i].querySelector('.elegir') as HTMLButtonElement).click();
      fixture.detectChanges();
    };

    pick(0);
    pick(2);
    expect(cards().map((c) => c.classList.contains('elegida'))).toEqual([true, false, true]);
    expect(root().querySelector('.selbar .count')?.textContent?.trim()).toBe('2 seleccionados');

    pick(0);
    expect(cards().map((c) => c.classList.contains('elegida'))).toEqual([false, false, true]);
    expect(root().querySelector('.selbar .count')?.textContent?.trim()).toBe('1 seleccionado');
  });

  it('limpiar desde la barra desmarca las tarjetas', async () => {
    await render(true);
    (cards()[1].querySelector('.elegir') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root().querySelector('.limpiar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(cards().some((c) => c.classList.contains('elegida'))).toBeFalse();
    expect(root().querySelector('.selbar')).toBeNull();
  });
});
