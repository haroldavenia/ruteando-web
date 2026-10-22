import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { ApiError } from '../../core/api/api-error';

import { DeleteConfirmation } from './delete-confirmation';
import { DeleteFlow } from './delete-flow';

describe('DeleteFlow', () => {
  let flow: DeleteFlow;
  let reload: jasmine.Spy;
  let answer: boolean;

  beforeEach(() => {
    answer = true;
    TestBed.configureTestingModule({
      providers: [{ provide: DeleteConfirmation, useValue: { ask: () => of(answer) } }],
    });
    flow = runInInjectionContext(TestBed.inject(Injector), () => new DeleteFlow());
    reload = jasmine.createSpy('reload');
  });

  const run = (request: () => Observable<unknown>) =>
    flow.run({ entity: 'vehículo', name: 'ABC123', request, reload, byStatus: { 409: 'En uso', 400: 'En uso' } });

  it('al confirmar borra, avisa y recarga', () => {
    const request = jasmine.createSpy().and.returnValue(of(undefined));
    run(request);
    expect(request).toHaveBeenCalledTimes(1);
    expect(flow.success()).toBe('Se eliminó vehículo «ABC123»');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('al cancelar no borra ni recarga', () => {
    answer = false;
    const request = jasmine.createSpy().and.returnValue(of(undefined));
    run(request);
    expect(request).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(flow.success()).toBeNull();
  });

  it('un registro en uso (409 o 400) muestra el texto de la pantalla y no recarga', () => {
    run(() => throwError(() => new ApiError({ status: 409, message: 'genérico' })));
    expect(flow.error()).toBe('En uso');
    run(() => throwError(() => new ApiError({ status: 400, message: 'genérico' })));
    expect(flow.error()).toBe('En uso');
    expect(reload).not.toHaveBeenCalled();
  });

  it('un 404 avisa de que ya no existe y recarga el listado', () => {
    run(() => throwError(() => new ApiError({ status: 404, message: 'No se encontró' })));
    expect(flow.success()).toContain('El registro ya no existe');
    expect(flow.error()).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('otros errores usan el mensaje del error', () => {
    run(() => throwError(() => new ApiError({ status: 500, message: 'Servicio caído' })));
    expect(flow.error()).toBe('Servicio caído');
  });
});
