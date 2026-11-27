import { requestJson } from './api-client';
import type { TFunction } from './i18n/core';
import { SSO_ERRORS } from './sso-messages';

export type SsoProviderId = 'google' | 'github' | 'apple' | 'enterprise';

export interface SsoProvider {
  id: SsoProviderId;
  label: string;
}

export interface SsoIdentity {
  provider: SsoProviderId;
  label: string;
  /** Correo con el que el proveedor identificó a la persona. */
  email: string;
  linkedAt: string;
  lastLoginAt: string;
}

export interface SsoPolicy {
  tenantId: string;
  /** La empresa permite entrar con SSO. */
  enabled: boolean;
  /** Proveedores que el servidor ofrece. */
  providers: SsoProvider[];
}

/** Proveedor OIDC propio de la empresa. El secreto nunca vuelve del servidor: `hasSecret` solo dice que existe. */
export interface SsoEnterprise {
  /** El servidor tiene activado el SSO empresarial. */
  available: boolean;
  configured: boolean;
  name: string;
  issuer: string;
  clientId: string;
  hasSecret: boolean;
  domains: string[];
  /** Dirección de regreso que hay que registrar en el proveedor de la empresa. */
  redirectUri: string;
}

export interface SsoEnterpriseInput {
  name: string;
  issuer: string;
  clientId: string;
  /** Vacío = conservar el secreto guardado. */
  clientSecret: string;
  domains: string[];
}

const BASE = '/middleware/sso';

/** Gestión del inicio de sesión único con sesión (`/middleware/sso/**`, lo atiende el propio BFF). */
export const ssoApi = (t: TFunction) => ({
  identities: () => requestJson<{ identities: SsoIdentity[] }>('GET', `${BASE}/identities`, undefined, t, SSO_ERRORS),
  unlink: (provider: SsoProvider['id']) =>
    requestJson<{ unlinked: true }>(
      'DELETE',
      `${BASE}/identities/${encodeURIComponent(provider)}`,
      undefined,
      t,
      SSO_ERRORS
    ),
  policy: () => requestJson<SsoPolicy>('GET', `${BASE}/policy`, undefined, t, SSO_ERRORS),
  setPolicy: (enabled: boolean) =>
    requestJson<{ tenantId: string; enabled: boolean }>('PUT', `${BASE}/policy`, { enabled }, t, SSO_ERRORS),
  enterprise: () => requestJson<SsoEnterprise>('GET', `${BASE}/enterprise`, undefined, t, SSO_ERRORS),
  saveEnterprise: (input: SsoEnterpriseInput) =>
    requestJson<SsoEnterprise>('PUT', `${BASE}/enterprise`, input, t, SSO_ERRORS),
  deleteEnterprise: () => requestJson<SsoEnterprise>('DELETE', `${BASE}/enterprise`, undefined, t, SSO_ERRORS),
});

/** Separa por comas, espacios o saltos de línea; minúsculas y sin repetidos. */
export function parseDomains(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}
