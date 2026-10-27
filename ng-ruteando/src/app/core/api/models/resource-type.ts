export interface ResourceType {
  id: string;
  tenantId: string;
  /** Categoría del tipo de recurso (`van`, `truck`...). */
  category: string;
  name: string;
  /** Perfil de ruteo del dominio maestro `OsrmProfile` (`driving`, `cycling`, `walking`). */
  osrmProfile: string;
  // Estructuras sin ejemplo con valor en la colección: se tratan como opacas hasta documentarlas
  capacity: Record<string, unknown> | null;
  measure: Record<string, unknown> | null;
  restriction: Record<string, unknown> | null;
  gasMileage: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceTypeInput {
  category: string;
  name: string;
  osrmProfile: string;
  capacity?: Record<string, unknown> | null;
  measure?: Record<string, unknown> | null;
  restriction?: Record<string, unknown> | null;
  gasMileage?: number | null;
}
