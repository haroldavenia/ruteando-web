import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { SessionExpiredNotifier } from './session-notifier';
import { SessionRefreshService } from './session-refresh.service';

describe('SessionExpiredNotifier', () => {
  it('muestra "Tu sesión ha caducado" cuando la sesión se da por caducada', async () => {
    const open = jasmine.createSpy('open');
    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: { open } },
        { provide: Router, useValue: { url: '/', navigate: () => Promise.resolve(true) } },
        { provide: SessionRefreshService, useValue: { expired$: new (await import('rxjs')).Subject<void>() } },
      ],
    });
    TestBed.inject(SessionExpiredNotifier);

    TestBed.inject(SessionRefreshService).expired$.next();
    await new Promise((resolve) => setTimeout(resolve)); // el snack-bar se carga de forma diferida

    expect(open).toHaveBeenCalledOnceWith('Tu sesión ha caducado', 'Cerrar', { duration: 6000 });
  });
});
