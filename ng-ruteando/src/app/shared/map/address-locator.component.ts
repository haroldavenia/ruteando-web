import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subscription } from 'rxjs';

import { ApiError } from '../../core/api/api-error';
import { GeocodingApi } from '../../core/api/data/geocoding.api';
import { GeocodeResult } from '../../core/api/models';
import { latLng } from '../../core/geo/lat-lng';
import { t } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LocationGroup } from './location-fields.component';

type Tone = 'info' | 'warning' | 'error';

/**
 * Ubica la dirección escrita en el formulario y, al revés, toma la dirección del punto elegido. Escribe directamente en los
 * controles que recibe (la ubicación, y la dirección, ciudad y país al tomar la del punto) y los marca como modificados.
 * Complementa a `app-location-fields`: ese da el mapa y los campos de coordenadas; este, la búsqueda. Sin la búsqueda se
 * puede seguir colocando el punto a mano.
 */
@Component({
  selector: 'app-address-locator',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="actions">
      <button mat-stroked-button type="button" (click)="locate()" [disabled]="busy()">
        <mat-icon aria-hidden="true">search</mat-icon>{{ 'Ubicar la dirección en el mapa' | t }}
      </button>
      <button mat-stroked-button type="button" (click)="takeFromPoint()" [disabled]="busy()">
        <mat-icon aria-hidden="true">pin_drop</mat-icon>{{ 'Tomar la dirección del punto' | t }}
      </button>
    </div>
    @if (busy()) {
      <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Buscando…' | t" />
    }
    <p class="note" [class.warning]="tone() === 'warning'" [class.error]="tone() === 'error'" role="status">
      {{ message() }}
    </p>
  `,
  styles: `
    :host {
      display: block;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .note {
      min-height: 1.5em;
      margin: 8px 0 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .warning {
      color: var(--app-on-warning-container);
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class AddressLocatorComponent {
  readonly address = input.required<FormControl<string>>();
  readonly location = input.required<LocationGroup>();
  /** Ciudad y país del formulario, si los tiene: ayudan a ubicar la dirección y se rellenan al tomar la del punto. */
  readonly city = input<FormControl<string> | null>(null);
  readonly country = input<FormControl<string> | null>(null);
  /** El resultado de cada búsqueda de la dirección, por si quien lo usa guarda la dirección estandarizada o el puntaje. */
  readonly located = output<GeocodeResult>();

  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly tone = signal<Tone>('info');

  private readonly api = inject(GeocodingApi);
  private current: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.current?.unsubscribe());
  }

  protected locate(): void {
    const address = this.address().value.trim();
    if (!address) {
      return this.say(t('Escribe primero la dirección'), 'warning');
    }
    this.start();
    this.current = this.api.geocode({ address, city: this.city()?.value, country: this.country()?.value }).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.located.emit(result);
        if (result.status === 'unmatch' || !result.location) {
          return this.say(t('No se encontró la dirección. Colócala en el mapa o escribe las coordenadas.'), 'warning');
        }
        const group = this.location();
        group.patchValue(result.location);
        group.markAsDirty();
        if (result.status === 'mean') {
          return this.say(t('Ubicación aproximada: revisa el punto y muévelo si hace falta.'), 'warning');
        }
        this.say(
          result.standardizedAddress
            ? t('Dirección ubicada como «{0}». Revisa el punto en el mapa.', [result.standardizedAddress])
            : t('Dirección ubicada. Revisa el punto en el mapa.'),
          'info'
        );
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected takeFromPoint(): void {
    const { lat, lng } = this.location().getRawValue();
    const point = latLng(lat, lng);
    if (!point) {
      return this.say(t('Elige primero un punto en el mapa o escribe la latitud y la longitud'), 'warning');
    }
    this.start();
    this.current = this.api.reverse(point).subscribe({
      next: (result) => {
        this.busy.set(false);
        if (!result.address) {
          return this.say(t('No hay una dirección conocida para ese punto.'), 'warning');
        }
        this.set(this.address(), result.address);
        if (result.city) {
          this.set(this.city(), result.city);
        }
        if (result.country) {
          this.set(this.country(), result.country);
        }
        this.say(t('Dirección tomada del punto elegido.'), 'info');
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  private set(control: FormControl<string> | null, value: string): void {
    control?.setValue(value);
    control?.markAsDirty();
  }

  private start(): void {
    this.current?.unsubscribe();
    this.busy.set(true);
    this.say('', 'info');
  }

  private fail(error: unknown): void {
    this.busy.set(false);
    this.say(error instanceof ApiError ? error.message : t('No se pudo completar la solicitud'), 'error');
  }

  private say(text: string, tone: Tone): void {
    this.message.set(text);
    this.tone.set(tone);
  }
}
