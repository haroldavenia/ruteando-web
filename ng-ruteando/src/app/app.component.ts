import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SessionExpiredNotifier } from './core/auth/session-notifier';
import { UpdateNotifier } from './core/pwa/update-notifier';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class AppComponent {
  // Se instancia aquí para avisar al usuario cuando la sesión caduque
  private readonly sessionNotifier = inject(SessionExpiredNotifier);
  // Y aquí, para avisar cuando el service worker tiene una versión nueva lista
  private readonly updateNotifier = inject(UpdateNotifier);
}
