import { Injectable, Injector, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SessionRefreshService } from './session-refresh.service';

/** Avisa al usuario cuando la sesión caduca y no se puede renovar. Se instancia al inyectarlo. */
@Injectable({ providedIn: 'root' })
export class SessionExpiredNotifier {
  private readonly injector = inject(Injector);

  constructor() {
    inject(SessionRefreshService)
      .expired$.pipe(takeUntilDestroyed())
      .subscribe(() => void this.show());
  }

  private async show(): Promise<void> {
    // Carga diferida: el snack-bar y el overlay no entran en el bundle inicial
    const { MatSnackBar } = await import('@angular/material/snack-bar');
    this.injector.get(MatSnackBar).open('Tu sesión ha caducado', 'Cerrar', { duration: 6000 });
  }
}
