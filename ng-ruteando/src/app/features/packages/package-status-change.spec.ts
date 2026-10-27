import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { PackagesApi } from '../../core/api/data/packages.api';
import { Package } from '../../core/api/models';

import { changePackageStatus } from './package-status-change';

describe('changePackageStatus', () => {
  const target = { id: 'p1', label: 'Guía 1' };
  const updated = { id: 'p1', status: 'attended' } as Package;
  let api: jasmine.SpyObj<PackagesApi>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const answer = (value: unknown) => dialog.open.and.returnValue({ afterClosed: () => of(value) } as never);

  beforeEach(() => {
    api = jasmine.createSpyObj<PackagesApi>('PackagesApi', ['setStatus']);
    api.setStatus.and.returnValue(of(updated));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
  });

  it('cambia el estado sin preguntar cuando no se cancela', () => {
    const emitted: Package[] = [];
    changePackageStatus(api, dialog, target, 'attended').subscribe((p) => emitted.push(p));
    expect(dialog.open).not.toHaveBeenCalled();
    expect(api.setStatus).toHaveBeenCalledOnceWith('p1', 'attended');
    expect(emitted).toEqual([updated]);
  });

  it('cancelar pide confirmación y cambia el estado si se acepta', () => {
    answer(true);
    changePackageStatus(api, dialog, target, 'cancelled').subscribe();
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(api.setStatus).toHaveBeenCalledOnceWith('p1', 'cancelled');
  });

  it('cancelar no llama al gateway si se rechaza la confirmación', () => {
    answer(false);
    let completed = false;
    changePackageStatus(api, dialog, target, 'cancelled').subscribe({ complete: () => (completed = true) });
    expect(api.setStatus).not.toHaveBeenCalled();
    expect(completed).toBeTrue();
  });
});
