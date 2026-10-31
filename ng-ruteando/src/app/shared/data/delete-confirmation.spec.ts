import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ApiError } from '../../core/api/api-error';

import { messageFor } from './api-messages';
import { DeleteConfirmation } from './delete-confirmation';

describe('DeleteConfirmation', () => {
  let overlay: HTMLElement;
  let service: DeleteConfirmation;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const button = (text: string) =>
    (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    service = TestBed.inject(DeleteConfirmation);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
  });
  afterEach(() => TestBed.inject(MatDialog).closeAll());

  async function ask(): Promise<boolean[]> {
    const results: boolean[] = [];
    service.ask('vehículo', 'ABC123').subscribe((v) => results.push(v));
    TestBed.inject(ApplicationRef).tick();
    await wait();
    return results;
  }

  it('nombra el verbo y el registro', async () => {
    await ask();
    expect(overlay.querySelector('h2')?.textContent).toContain('Eliminar vehículo');
    expect(overlay.textContent).toContain('«ABC123»');
    expect(button('Eliminar')).toBeDefined();
  });

  it('es una acción destructiva: «Eliminar» se muestra con el color de error', async () => {
    await ask();
    const probe = document.createElement('div');
    probe.style.background = 'var(--mat-sys-error)';
    document.body.appendChild(probe);
    const error = getComputedStyle(probe).backgroundColor;
    probe.remove();

    expect(getComputedStyle(button('Eliminar')).backgroundColor).toBe(error);
  });

  it('confirmar emite true', async () => {
    const results = await ask();
    button('Eliminar').click();
    await wait();
    expect(results).toEqual([true]);
  });

  it('cancelar emite false', async () => {
    const results = await ask();
    button('Cancelar').click();
    await wait();
    expect(results).toEqual([false]);
  });

  it('Escape emite false y el foco vuelve al botón que abrió el diálogo', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const results = await ask();

    (overlay.querySelector('.mat-mdc-dialog-container') as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    await wait();

    expect(results).toEqual([false]);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('messageFor', () => {
  it('usa el texto de la pantalla para ese estado', () => {
    expect(messageFor(new ApiError({ status: 409, message: 'genérico' }), { 409: 'En uso' })).toBe('En uso');
  });

  it('sin texto propio usa el mensaje del error', () => {
    expect(messageFor(new ApiError({ status: 500, message: 'Servicio caído' }), { 409: 'En uso' })).toBe('Servicio caído');
  });

  it('con un error desconocido usa un texto neutro', () => {
    expect(messageFor(new Error('x'))).toBe('No se pudo completar la solicitud');
  });
});
