import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { UpdateNotifier } from './update-notifier';

describe('UpdateNotifier', () => {
  function setup() {
    const versionUpdates = new Subject<unknown>();
    const action = new Subject<void>();
    const open = jasmine.createSpy('open').and.returnValue({ onAction: () => action });
    const activateUpdate = jasmine.createSpy('activateUpdate').and.resolveTo(true);
    const reload = jasmine.createSpy('reload');
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: { versionUpdates, activateUpdate } },
        { provide: MatSnackBar, useValue: { open } },
        { provide: DOCUMENT, useValue: { location: { reload } } },
      ],
    });
    TestBed.inject(UpdateNotifier);
    return { versionUpdates, action, open, activateUpdate, reload };
  }

  const tick = () => new Promise((resolve) => setTimeout(resolve)); // el snack-bar se carga de forma diferida

  it('avisa cuando la versión nueva está lista y no con otros eventos', async () => {
    const { versionUpdates, open } = setup();

    versionUpdates.next({ type: 'VERSION_DETECTED' });
    await tick();
    expect(open).not.toHaveBeenCalled();

    versionUpdates.next({ type: 'VERSION_READY' });
    await tick();
    expect(open).toHaveBeenCalledOnceWith('Hay una versión nueva de Ruteando', 'Recargar');
  });

  it('al pulsar «Recargar» activa la versión y recarga la página', async () => {
    const { versionUpdates, action, activateUpdate, reload } = setup();
    versionUpdates.next({ type: 'VERSION_READY' });
    await tick();

    action.next();
    await tick();

    expect(activateUpdate).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });
});
