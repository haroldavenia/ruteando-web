export interface MasterDomainValue {
  key: string;
  label: string;
  description: string | null;
  sortOrder: number | null;
  active: boolean;
}

/** Catálogo de valores del gateway (`RouteTopology`, `PackageStatus`, `PlaceType`...). */
export interface MasterDomain {
  id: string;
  code: string;
  description: string;
  /** `true` en los dominios propios del sistema. */
  system: boolean;
  values: MasterDomainValue[];
}

export interface MasterDomainValueInput {
  key: string;
  label: string;
  description?: string | null;
  sortOrder?: number | null;
}
