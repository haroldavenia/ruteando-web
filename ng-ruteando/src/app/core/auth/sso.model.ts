/** Proveedores de inicio de sesión único que el servidor puede ofrecer. */
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
