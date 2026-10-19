import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Ruteando</h1>
    <p>Planificación de rutas.</p>
  `,
})
export class HomeComponent {}
