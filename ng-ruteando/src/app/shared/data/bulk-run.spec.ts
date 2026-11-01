import { Observable, Subject, defer, finalize, of, throwError } from 'rxjs';

import { ApiError } from '../../core/api/api-error';

import { BULK_CONCURRENCY, BulkResult, BulkTarget, bulkDeleteMessages, deleteMany, runBulk } from './bulk-run';

const targets = (n: number): BulkTarget[] => Array.from({ length: n }, (_, i) => ({ id: `id${i}`, label: `Registro ${i}` }));
const apiError = (status: number, message = 'Error del gateway'): ApiError => new ApiError({ status, message });

function collect<T>(source$: Observable<T>): { values: T[]; completed: () => boolean } {
  const values: T[] = [];
  let done = false;
  source$.subscribe({ next: (v) => values.push(v), complete: () => (done = true) });
  return { values, completed: () => done };
}

describe('runBulk', () => {
  it('con una lista vacía termina sin hacer nada', () => {
    const { values } = collect(runBulk([], () => of(null)));
    expect(values).toEqual([{ done: 0, failed: [] }]);
  });

  it('cuenta los hechos y nombra los que fallan con su motivo, sin detener a los demás', () => {
    const calls: string[] = [];
    const { values } = collect(
      runBulk(targets(10), (id) => {
        calls.push(id);
        return ['id2', 'id5', 'id9'].includes(id) ? throwError(() => apiError(409, 'En uso')) : of(null);
      }),
    );
    expect(calls.length).toBe(10);
    expect(values[0].done).toBe(7);
    expect(values[0].failed.map((f) => f.label)).toEqual(['Registro 2', 'Registro 5', 'Registro 9']);
    expect(values[0].failed[0].message).toBe('En uso');
  });

  it('usa el texto por estado cuando se da', () => {
    const { values } = collect(runBulk(targets(1), () => throwError(() => apiError(409, 'genérico')), { byStatus: { 409: 'El registro está en uso' } }));
    expect(values[0].failed[0].message).toBe('El registro está en uso');
  });

  it('un error que no es del gateway da el texto genérico', () => {
    const { values } = collect(runBulk(targets(1), () => throwError(() => new Error('boom'))));
    expect(values[0].failed[0].message).toBe('No se pudo completar la solicitud');
  });

  it('los estados de doneOnStatus cuentan como hechos', () => {
    const { values } = collect(runBulk(targets(2), (id) => (id === 'id0' ? throwError(() => apiError(404)) : of(null)), { doneOnStatus: [404] }));
    expect(values[0]).toEqual({ done: 2, failed: [] });
  });

  it('nunca hay más de BULK_CONCURRENCY peticiones a la vez', () => {
    let active = 0;
    let peak = 0;
    const pending: Subject<null>[] = [];
    const op = (): Observable<unknown> =>
      defer(() => {
        active += 1;
        peak = Math.max(peak, active);
        const request = new Subject<null>();
        pending.push(request);
        return request.pipe(finalize(() => (active -= 1)));
      });
    const { completed } = collect(runBulk(targets(10), op));
    expect(pending.length).toBe(BULK_CONCURRENCY);
    // Cada respuesta libera un hueco y entra la siguiente petición
    while (pending.length > 0) {
      const request = pending.shift() as Subject<null>;
      request.next(null);
      request.complete();
    }
    expect(peak).toBe(BULK_CONCURRENCY);
    expect(completed()).toBeTrue();
  });
});

describe('deleteMany', () => {
  const dialogReturning = (confirmed: unknown) => ({ open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(confirmed) }) });
  const options = (remove: (id: string) => Observable<unknown>) => ({ singular: 'vehículo', plural: 'vehículos', targets: targets(4), remove });

  it('si se cancela no llama al gateway y no emite nada', () => {
    const remove = jasmine.createSpy('remove').and.returnValue(of(null));
    const { values, completed } = collect(deleteMany(dialogReturning(false), options(remove)));
    expect(remove).not.toHaveBeenCalled();
    expect(values).toEqual([]);
    expect(completed()).toBeTrue();
  });

  it('pide una sola confirmación para todos y borra uno por uno', () => {
    const dialog = dialogReturning(true);
    const remove = jasmine.createSpy('remove').and.returnValue(of(null));
    const { values } = collect(deleteMany(dialog, options(remove)));
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(4);
    expect(values[0]).toEqual({ done: 4, failed: [] });
  });

  it('el diálogo nombra la cantidad y es destructivo', () => {
    const dialog = dialogReturning(true);
    collect(deleteMany(dialog, options(() => of(null))));
    const data = dialog.open.calls.mostRecent().args[1].data;
    expect(data.message).toContain('4 vehículos');
    expect(data.destructive).toBeTrue();
  });

  it('un 404 al borrar cuenta como hecho', () => {
    const { values } = collect(deleteMany(dialogReturning(true), options((id) => (id === 'id1' ? throwError(() => apiError(404)) : of(null)))));
    expect(values[0]).toEqual({ done: 4, failed: [] });
  });
});

describe('bulkDeleteMessages', () => {
  const result = (done: number, failed: BulkResult['failed'] = []): BulkResult => ({ done, failed });

  it('uno solo', () => {
    expect(bulkDeleteMessages(result(1), 'vehículo', 'vehículos')).toEqual({ success: 'Se eliminó 1 vehículo', error: null });
  });

  it('todos', () => {
    expect(bulkDeleteMessages(result(4), 'vehículo', 'vehículos').success).toBe('Se eliminaron 4 vehículos');
  });

  it('algunos: «3 de 4» y el motivo de cada uno que falló', () => {
    const messages = bulkDeleteMessages(result(3, [{ label: 'ABC-1', message: 'En uso' }]), 'vehículo', 'vehículos');
    expect(messages.success).toBe('Se eliminaron 3 de 4 vehículos');
    expect(messages.error).toBe('No se pudo eliminar 1 vehículo: «ABC-1» (En uso)');
  });

  it('ninguno: solo el error', () => {
    const messages = bulkDeleteMessages(result(0, [{ label: 'A', message: 'x' }, { label: 'B', message: 'y' }]), 'tipo', 'tipos');
    expect(messages.success).toBeNull();
    expect(messages.error).toBe('No se pudo eliminar 2 tipos: «A» (x); «B» (y)');
  });
});
