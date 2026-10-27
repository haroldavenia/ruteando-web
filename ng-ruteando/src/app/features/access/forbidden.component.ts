import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-forbidden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Sin permiso</h1>
    <p>No tienes permiso para ver esta página.</p>
  `,
})
export class ForbiddenComponent {}
