import { Observable, Subject, of, throwError } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import { Package } from '../../core/api/models';

import { BULK_STATUS_CONCURRENCY, BulkStatusResult, changeStatusOfMany } from './package-bulk-status';

const targets = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, label: `Paquete ${i}` }));
const fakeDialog = (answer: boolean | undefined) => ({ open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(answer) }) });

describe('changeStatusOfMany', () => {
  const run = (obs: Observable<BulkStatusResult>) => {
    let result: BulkStatusResult | undefined;
    let completed = false;
    obs.subscribe({ next: (r) => (result = r), complete: () => (completed = true) });
    return { result: () => result, completed: () => completed };
  };

  it('pide el cambio de cada paquete y cuenta los cambiados', () => {
    const setStatus = jasmine.createSpy('setStatus').and.callFake(() => of({} as Package));
    const { result } = run(changeStatusOfMany({ setStatus }, fakeDialog(true), targets(3), 'attended'));

    expect(setStatus.calls.allArgs()).toEqual([['p0', 'attended'], ['p1', 'attended'], ['p2', 'attended']]);
    expect(result()).toEqual({ changed: 3, failed: [] });
  });

  it('un fallo no detiene a los demás y se cuenta con su nombre y su motivo', () => {
    const setStatus = jasmine
      .createSpy('setStatus')
      .and.callFake((id: string) => (id === 'p1' ? throwError(() => new ApiError({ status: 409, message: 'Estado no permitido' })) : of({} as Package)));
    const { result } = run(changeStatusOfMany({ setStatus }, fakeDialog(true), targets(3), 'returned'));

    expect(result()?.changed).toBe(2);
    expect(result()?.failed.length).toBe(1);
    expect(result()?.failed[0].label).toBe('Paquete 1');
    expect(result()?.failed[0].message).toBeTruthy();
  });

  it('pide de a pocos a la vez, no todos de golpe', () => {
    const open: Subject<Package>[] = [];
    const setStatus = jasmine.createSpy('setStatus').and.callFake(() => {
      const s = new Subject<Package>();
      open.push(s);
      return s;
    });
    const { completed } = run(changeStatusOfMany({ setStatus }, fakeDialog(true), targets(10), 'attended'));

    expect(setStatus).toHaveBeenCalledTimes(BULK_STATUS_CONCURRENCY);
    open[0].next({} as Package);
    open[0].complete();
    expect(setStatus).toHaveBeenCalledTimes(BULK_STATUS_CONCURRENCY + 1);
    expect(completed()).toBeFalse();
  });

  it('cancelar pide una sola confirmación para todos', () => {
    const setStatus = jasmine.createSpy('setStatus').and.callFake(() => of({} as Package));
    const dialog = fakeDialog(true);
    run(changeStatusOfMany({ setStatus }, dialog, targets(3), 'cancelled'));

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect((dialog.open.calls.mostRecent().args[1] as { data: { message: string } }).data.message).toBe('¿Cancelar los 3 paquetes elegidos?');
    expect(setStatus).toHaveBeenCalledTimes(3);
  });

  it('si se rechaza la confirmación no llama al gateway ni emite', () => {
    const setStatus = jasmine.createSpy('setStatus');
    const { result, completed } = run(changeStatusOfMany({ setStatus }, fakeDialog(false), targets(2), 'cancelled'));

    expect(setStatus).not.toHaveBeenCalled();
    expect(result()).toBeUndefined();
    expect(completed()).toBeTrue();
  });

  it('otros estados no piden confirmación', () => {
    const dialog = fakeDialog(true);
    run(changeStatusOfMany({ setStatus: () => of({} as Package) }, dialog, targets(2), 'pending'));

    expect(dialog.open).not.toHaveBeenCalled();
  });
});
