import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, shareReplay, tap, throwError } from 'rxjs';

import { MasterDomain, MasterDomainValue } from '../models';
import { MasterDomainsApi } from './master-domains.api';

function values(...pairs: [string, string][]): MasterDomainValue[] {
  return pairs.map(([key, label], index) => ({ key, label, description: null, sortOrder: index + 1, active: true }));
}

/** Valores por defecto (los del gateway) para poder pintar formularios antes de cargar los reales. */
export const MASTER_DOMAIN_DEFAULTS: Readonly<Record<string, readonly MasterDomainValue[]>> = {
  OsrmProfile: values(['driving', 'Driving'], ['cycling', 'Cycling'], ['walking', 'Walking']),
  RouteTopology: values(
    ['depot_to_depot', 'Depot To Depot'],
    ['round_trip', 'Round Trip'],
    ['open_delivery', 'Open Delivery'],
    ['open_pickup', 'Open Pickup'],
    ['flexible', 'Flexible'],
  ),
  PackageStatus: values(
    ['pending', 'Pending'],
    ['attended', 'Attended'],
    ['unattended', 'Unattended'],
    ['cancelled', 'Cancelled'],
    ['returned', 'Returned'],
  ),
};

/**
 * Enumeraciones del gateway (`master-domains`) con caché en memoria. Las lecturas funcionan siempre:
 * antes de cargar (o sin red) devuelven los valores por defecto; `load()` los sustituye por los reales.
 */
@Injectable({ providedIn: 'root' })
export class MasterDomainsService {
  private readonly api = inject(MasterDomainsApi);
  private readonly state = signal<Readonly<Record<string, readonly MasterDomainValue[]>>>(MASTER_DOMAIN_DEFAULTS);
  private loaded: Observable<MasterDomain[]> | null = null;

  /** Valores del dominio `code`, o una lista vacía si no existe. */
  values(code: string): readonly MasterDomainValue[] {
    return this.state()[code] ?? [];
  }

  /** Carga los dominios una sola vez; si falla no se cachea el fallo y se conservan los valores actuales. */
  load(): Observable<MasterDomain[]> {
    if (this.loaded) {
      return this.loaded;
    }
    const request$ = this.api.list().pipe(
      tap((domains) => this.state.set(Object.fromEntries(domains.map((domain) => [domain.code, domain.values])))),
      catchError((error: unknown) => {
        this.loaded = null; // el siguiente intento vuelve a pedirlos
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.loaded = request$;
    return request$;
  }
}
