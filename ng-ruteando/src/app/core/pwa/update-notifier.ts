import { DOCUMENT } from '@angular/common';
import { inject, Injectable, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

import { t } from '../i18n/i18n';
/**
 * Avisa de que hay una versión nueva (el service worker ya la descargó) y la activa al pulsar «Recargar». Sin service worker
 * (desarrollo, servidor, navegador sin soporte) `SwUpdate` no emite y no hace nada. Se instancia al inyectarlo.
 */
@Injectable({ providedIn: 'root' })
export class UpdateNotifier {
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly swUpdate = inject(SwUpdate);

  constructor() {
    this.swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed()
      )
      .subscribe(() => void this.show());
  }

  private async show(): Promise<void> {
    // Carga diferida: el snack-bar y el overlay no entran en el bundle inicial
    const { MatSnackBar } = await import('@angular/material/snack-bar');
    this.injector
      .get(MatSnackBar)
      .open(t('Hay una versión nueva de Ruteando'), t('Recargar'))
      .onAction()
      .subscribe(() => void this.swUpdate.activateUpdate().then(() => this.document.location.reload()));
  }
}
