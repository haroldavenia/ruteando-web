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
  async function open(extra: { destructive?: boolean } = {}) {
    const ref = dialog.open(ConfirmDialogComponent, {
      data: { title: 'Borrar lugar', message: '¿Seguro que quieres borrarlo?', confirmLabel: 'Borrar', ...extra },
    });
    TestBed.inject(ApplicationRef).tick();
    await new Promise((resolve) => setTimeout(resolve, 40));
    return ref;
  }
  const buttons = () => Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[];
  const byText = (text: string) => buttons().find((b) => b.textContent?.trim() === text)!;

  it('el diálogo tiene las esquinas redondeadas del sistema de interfaz', async () => {
    await open();
    const surface = overlay.querySelector('.mat-mdc-dialog-surface') as HTMLElement;
    expect(getComputedStyle(surface).borderTopLeftRadius).toBe('24px');
  });

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

  describe('acción destructiva', () => {
    const tokenColor = (token: string) => {
      const probe = document.createElement('div');
      probe.style.background = `var(${token})`;
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };

    it('con destructive el botón de confirmar usa los colores de error y el de cancelar no cambia', async () => {
      await open({ destructive: true });

      expect(getComputedStyle(byText('Borrar')).backgroundColor).toBe(tokenColor('--mat-sys-error'));
      expect(getComputedStyle(byText('Cancelar')).backgroundColor).not.toBe(tokenColor('--mat-sys-error'));
    });

    it('sin destructive el botón de confirmar conserva el color primario', async () => {
      await open();

      expect(getComputedStyle(byText('Borrar')).backgroundColor).toBe(tokenColor('--mat-sys-primary'));
    });

    it('con destructive el foco inicial sigue en «Cancelar» y confirmar sigue devolviendo true', async () => {
      const result = firstValueFrom((await open({ destructive: true })).afterClosed());

      expect(document.activeElement).toBe(byText('Cancelar'));
      byText('Borrar').click();
      expect(await result).toBeTrue();
    });
  });

  it('el foco inicial está en "Cancelar", la opción segura', async () => {
    await open();

    expect(document.activeElement).toBe(byText('Cancelar'));
  });
});
