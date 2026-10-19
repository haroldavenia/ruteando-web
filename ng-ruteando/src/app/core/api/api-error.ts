import { HttpErrorResponse } from '@angular/common/http';

/**
 * Fallo de una petición al gateway. `message` es el texto que ve el usuario (genérico o
 * personalizado); el cuerpo que mandó el servidor queda en `details` y la respuesta original en `raw`.
 */
export class ApiError extends Error {
  /** Estado HTTP; 0 si no hubo respuesta (sin conexión). */
  readonly status: number;
  /** Código de error del backend, si el cuerpo lo trae. */
  readonly code: string | null;
  readonly details: unknown;
  readonly raw: HttpErrorResponse | null;

  constructor(init: { status: number; code?: string | null; message: string; details?: unknown; raw?: HttpErrorResponse | null }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code ?? null;
    this.details = init.details ?? null;
    this.raw = init.raw ?? null;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

/** Interpreta el cuerpo de un error de forma tolerante (formato no documentado). */
export function readErrorBody(body: unknown): { code: string | null; details: unknown } {
  let value = body;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return { code: null, details: value || null };
    }
  }
  if (value === null || typeof value !== 'object') {
    return { code: null, details: value ?? null };
  }
  const record = value as Record<string, unknown>;
  let code: string | null = null;
  if (typeof record['code'] === 'string' && record['code']) {
    code = record['code'];
  } else if (typeof record['error'] === 'string' && /^[A-Z][A-Z0-9_]+$/.test(record['error'])) {
    code = record['error']; // `error` solo se toma como código si tiene aspecto de código
  }
  return { code, details: value };
}
