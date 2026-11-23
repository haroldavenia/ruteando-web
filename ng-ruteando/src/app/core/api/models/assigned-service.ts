/** Servicio asignado (ruta + vehículo + conductor). Los objetos anidados no tienen ejemplo con datos: son opacos. */
export interface AssignedService {
  id: string;
  vehicle: Record<string, unknown> | null;
  route: Record<string, unknown> | null;
  driver: Record<string, unknown> | null;
  /** Estado en el idioma del gateway (`ACTIVO`...). */
  state: string;
  executionDate: string | null;
}

export interface AssignedServiceInput {
  state: string;
  vehicle?: Record<string, unknown> | null;
  route?: Record<string, unknown> | null;
  driver?: Record<string, unknown> | null;
  executionDate?: string | null;
}
