/** Respuesta JSON con mensaje genérico: nunca la dirección del gateway, la clave ni trazas. */
export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return Response.json({ message, ...extra }, { status });
}

export const GENERIC_5XX = 'El servicio no está disponible.';
