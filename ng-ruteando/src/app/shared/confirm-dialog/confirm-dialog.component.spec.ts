import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { firstValueFrom } from 'rxjs';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let dialog: MatDialog;
  let overlay: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    dialog = TestBed.inject(MatDialog);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => dialog.closeAll());

  /** Abre el diálogo y deja que se renderice (el diálogo no pinta hasta un ciclo de detección de cambios). */
  async function open() {
    const ref = dialog.open(ConfirmDialogComponent, {
      data: { title: 'Borrar lugar', message: '¿Seguro que quieres borrarlo?', confirmLabel: 'Borrar' },
    });
    TestBed.inject(ApplicationRef).tick();
    await new Promise((resolve) => setTimeout(resolve, 40));
    return ref;
  }
  const buttons = () => Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[];
  const byText = (text: string) => buttons().find((b) => b.textContent?.trim() === text)!;

  it('muestra el título, el mensaje y los textos recibidos', async () => {
    await open();

    expect(overlay.querySelector('h2')?.textContent).toContain('Borrar lugar');
    expect(overlay.textContent).toContain('¿Seguro que quieres borrarlo?');
    expect(byText('Borrar')).toBeDefined();
    expect(byText('Cancelar')).toBeDefined();
  });

  it('confirmar devuelve true', async () => {
    const result = firstValueFrom((await open()).afterClosed());
    byText('Borrar').click();

    expect(await result).toBeTrue();
  });

  it('cancelar devuelve false', async () => {
    const result = firstValueFrom((await open()).afterClosed());
    byText('Cancelar').click();

    expect(await result).toBeFalse();
  });

  it('Escape cierra sin confirmar', async () => {
    const result = firstValueFrom((await open()).afterClosed());
    const container = overlay.querySelector('.mat-mdc-dialog-container') as HTMLElement;
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

    expect(await result).not.toBeTrue();
  });

  it('el foco inicial está en "Cancelar", la opción segura', async () => {
    await open();

    expect(document.activeElement).toBe(byText('Cancelar'));
  });
});
