import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { ApiError } from '../../core/api/api-error';

import { SubmitState } from './submit-state';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  let overlay: HTMLElement;
  const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
  const button = (text: string) =>
    (Array.from(overlay.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.trim() === text)!;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
  });
  afterEach(() => TestBed.inject(MatDialog).closeAll());

  function run(dirty: boolean): Observable<boolean> {
    const component: HasUnsavedChanges = { hasUnsavedChanges: () => dirty };
    const result = runInInjectionContext(TestBed.inject(Injector), () =>
      unsavedChangesGuard(component, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot),
    );
    return result as Observable<boolean>;
  }

  it('con el formulario limpio deja salir sin preguntar', async () => {
    expect(await firstValueFrom(run(false))).toBeTrue();
    expect(overlay.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('con cambios pregunta y solo sale si se confirma el descarte', async () => {
    const results: boolean[] = [];
    run(true).subscribe((v) => results.push(v));
    TestBed.inject(ApplicationRef).tick();
    await wait();

    expect(overlay.textContent).toContain('¿Descartar los cambios?');
    expect(results).toEqual([]);
    button('Descartar').click();
    await wait();
    expect(results).toEqual([true]);
  });

  it('"Seguir editando" mantiene al usuario en la pantalla', async () => {
    const results: boolean[] = [];
    run(true).subscribe((v) => results.push(v));
    TestBed.inject(ApplicationRef).tick();
    await wait();

    button('Seguir editando').click();
    await wait();
    expect(results).toEqual([false]);
  });
});

describe('SubmitState', () => {
  it('desactiva el envío mientras dura la petición e ignora un segundo envío', () => {
    const state = new SubmitState();
    const subscribed = jasmine.createSpy();
    const source = new Observable<void>(() => subscribed());
    state.submit(source, () => undefined);
    expect(state.submitting()).toBeTrue();

    state.submit(source, () => undefined);
    expect(subscribed).toHaveBeenCalledTimes(1);
  });

  it('en éxito libera el botón y avisa', () => {
    const state = new SubmitState();
    const done = jasmine.createSpy();
    state.submit(of('ok'), done);
    expect(state.submitting()).toBeFalse();
    expect(done).toHaveBeenCalledOnceWith('ok');
  });

  it('en error muestra el texto de la pantalla para ese estado o el del error', () => {
    const state = new SubmitState();
    state.submit(throwError(() => new ApiError({ status: 409, message: 'genérico' })), () => undefined, { 409: 'Ya existe' });
    expect(state.error()).toBe('Ya existe');
    expect(state.submitting()).toBeFalse();

    state.submit(throwError(() => new ApiError({ status: 500, message: 'caído' })), () => undefined, { 409: 'Ya existe' });
    expect(state.error()).toBe('caído');
  });
});
