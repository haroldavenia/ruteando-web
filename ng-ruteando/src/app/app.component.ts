import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SessionExpiredNotifier } from './core/auth/session-notifier';

import { ShellComponent } from './layout/shell.component';

@Component({
  selector: 'app-root',
  imports: [ShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-shell />`,
})
export class AppComponent {
  // Se instancia aquí para avisar al usuario cuando la sesión caduque
  private readonly sessionNotifier = inject(SessionExpiredNotifier);
}
