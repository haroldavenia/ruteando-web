/**
 * Almacén SQLite (`node:sqlite`) del SSO: identidades enlazadas, política por empresa, proveedor OIDC de cada empresa (el secreto
 * llega ya cifrado) y un registro de eventos. Mismo patrón de migraciones que `mfa/store.ts` (`PRAGMA user_version`) y mismo esquema
 * que server/sso/store.js: el archivo es intercambiable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface Identity {
  provider: string;
  subject: string;
  userId: string;
  tenantId: string;
  email: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Enterprise {
  tenantId: string;
  name: string;
  issuer: string;
  clientId: string;
  secretEnc: string | null;
  /** Dominios reclamados (verificados o no). */
  domains: string[];
  /** Solo los que la empresa demostró controlar (TXT en DNS): son los únicos que enrutan y validan el correo. */
  verifiedDomains: string[];
}

export type SsoStore = ReturnType<typeof openSsoStore>;

// Cada entrada sube `user_version` en uno; nunca se edita una ya publicada, se añade otra.
const MIGRATIONS = [
  `
  CREATE TABLE sso_identity (
    provider TEXT NOT NULL,
    subject TEXT NOT NULL,
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT NOT NULL,
    PRIMARY KEY (provider, subject)
  );
  CREATE INDEX sso_identity_user ON sso_identity (user_id);
  CREATE TABLE sso_policy (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE sso_enterprise (
    tenant_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    secret_enc TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE sso_enterprise_domain (
    domain TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL
  );
  CREATE TABLE sso_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    user_id TEXT,
    tenant_id TEXT,
    kind TEXT NOT NULL,
    detail TEXT
  );
  `,
  // 2: los dominios se reclaman pendientes y se verifican con un TXT en DNS. La clave pasa a (dominio, empresa) para que dos empresas
  // puedan reclamar el mismo y gane la que lo demuestre: el índice único parcial solo deja un dueño verificado. Lo que había queda
  // PENDIENTE (nadie lo demostró): hay que verificarlo de nuevo.
  `
  CREATE TABLE sso_enterprise_domain_v2 (
    domain TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    verified_at TEXT,
    PRIMARY KEY (domain, tenant_id)
  );
  INSERT INTO sso_enterprise_domain_v2 (domain, tenant_id) SELECT domain, tenant_id FROM sso_enterprise_domain;
  DROP TABLE sso_enterprise_domain;
  ALTER TABLE sso_enterprise_domain_v2 RENAME TO sso_enterprise_domain;
  CREATE UNIQUE INDEX sso_domain_verified ON sso_enterprise_domain (domain) WHERE verified_at IS NOT NULL;
  `,
];

type Row = Record<string, string | number | null>;

export function openSsoStore(file: string, { now = () => new Date() }: { now?: () => Date } = {}) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  const stamp = () => now().toISOString();

  const q = {
    identity: db.prepare('SELECT * FROM sso_identity WHERE provider = ? AND subject = ?'),
    putIdentity: db.prepare(
      `INSERT INTO sso_identity (provider, subject, user_id, tenant_id, email, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider, subject) DO UPDATE SET email = excluded.email, last_login_at = excluded.last_login_at`
    ),
    identitiesOf: db.prepare('SELECT * FROM sso_identity WHERE user_id = ? ORDER BY created_at'),
    delIdentities: db.prepare('DELETE FROM sso_identity WHERE user_id = ? AND provider = ?'),
    delTenantIdentities: db.prepare('DELETE FROM sso_identity WHERE tenant_id = ? AND provider = ?'),
    policy: db.prepare('SELECT * FROM sso_policy WHERE tenant_id = ?'),
    putPolicy: db.prepare(
      `INSERT INTO sso_policy (tenant_id, enabled, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(tenant_id) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`
    ),
    enterprise: db.prepare('SELECT * FROM sso_enterprise WHERE tenant_id = ?'),
    putEnterprise: db.prepare(
      `INSERT INTO sso_enterprise (tenant_id, name, issuer, client_id, secret_enc, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id) DO UPDATE SET name = excluded.name, issuer = excluded.issuer, client_id = excluded.client_id,
         secret_enc = excluded.secret_enc, updated_at = excluded.updated_at`
    ),
    delEnterprise: db.prepare('DELETE FROM sso_enterprise WHERE tenant_id = ?'),
    domainsOf: db.prepare('SELECT domain, verified_at FROM sso_enterprise_domain WHERE tenant_id = ? ORDER BY domain'),
    domainOwner: db.prepare('SELECT tenant_id FROM sso_enterprise_domain WHERE domain = ? AND verified_at IS NOT NULL'),
    addDomain: db.prepare('INSERT OR IGNORE INTO sso_enterprise_domain (domain, tenant_id) VALUES (?, ?)'),
    delDomain: db.prepare('DELETE FROM sso_enterprise_domain WHERE domain = ? AND tenant_id = ?'),
    verifyDomain: db.prepare('UPDATE sso_enterprise_domain SET verified_at = ? WHERE domain = ? AND tenant_id = ? AND verified_at IS NULL'),
    delDomains: db.prepare('DELETE FROM sso_enterprise_domain WHERE tenant_id = ?'),
    addEvent: db.prepare('INSERT INTO sso_event (at, user_id, tenant_id, kind, detail) VALUES (?, ?, ?, ?, ?)'),
    events: db.prepare('SELECT * FROM sso_event WHERE user_id = ? ORDER BY id DESC LIMIT ?'),
  };

  const toIdentity = (r: Row | undefined): Identity | null =>
    r
      ? {
          provider: r.provider as string,
          subject: r.subject as string,
          userId: r.user_id as string,
          tenantId: r.tenant_id as string,
          email: r.email as string,
          createdAt: r.created_at as string,
          lastLoginAt: r.last_login_at as string,
        }
      : null;

  const transaction = (fn: () => void) => {
    db.exec('BEGIN');
    try {
      fn();
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };

  return {
    path: file,

    getIdentity: (provider: string, subject: string) => toIdentity(q.identity.get(provider, subject) as Row | undefined),
    identitiesOf: (userId: string) => (q.identitiesOf.all(userId) as Row[]).map((r) => toIdentity(r)!),
    /** Enlaza (o actualiza el último acceso de) una identidad. */
    putIdentity(i: Identity) {
      const at = stamp();
      q.putIdentity.run(i.provider, i.subject, i.userId, i.tenantId, i.email, at, at);
    },
    /** Desenlaza todas las identidades de un proveedor de una persona; devuelve cuántas había. */
    deleteIdentities: (userId: string, provider: string) => Number(q.delIdentities.run(userId, provider).changes),
    /** Desenlaza un proveedor para todas las personas de una empresa. */
    deleteProviderIdentities: (tenantId: string, provider: string) => Number(q.delTenantIdentities.run(tenantId, provider).changes),

    /** Por defecto el SSO está permitido; el administrador lo apaga por empresa. */
    getPolicy(tenantId: string) {
      const r = q.policy.get(tenantId) as Row | undefined;
      return { tenantId, enabled: r ? r.enabled === 1 : true };
    },
    setPolicy: (policy: { tenantId: string; enabled: boolean }) => void q.putPolicy.run(policy.tenantId, policy.enabled ? 1 : 0, stamp()),

    getEnterprise(tenantId: string): Enterprise | null {
      const r = q.enterprise.get(tenantId) as Row | undefined;
      if (!r) return null;
      const domains = q.domainsOf.all(tenantId) as { domain: string; verified_at: string | null }[];
      return {
        tenantId,
        name: r.name as string,
        issuer: r.issuer as string,
        clientId: r.client_id as string,
        secretEnc: r.secret_enc as string | null,
        domains: domains.map((d) => d.domain),
        verifiedDomains: domains.filter((d) => d.verified_at).map((d) => d.domain),
      };
    },
    /** Dueña VERIFICADA de un dominio de correo, o `null` (un dominio solo reclamado no tiene dueña). */
    domainOwner: (domain: string) => ((q.domainOwner.get(domain) as { tenant_id: string } | undefined)?.tenant_id ?? null),
    /**
     * Guarda el proveedor de la empresa y sustituye sus dominios: los que ya tenía conservan su verificación, los nuevos quedan
     * pendientes y los que se quitan se borran. El llamador ya comprobó que no son de otra empresa.
     */
    putEnterprise(e: Pick<Enterprise, 'tenantId' | 'name' | 'issuer' | 'clientId' | 'secretEnc' | 'domains'>) {
      transaction(() => {
        q.putEnterprise.run(e.tenantId, e.name, e.issuer, e.clientId, e.secretEnc ?? null, stamp());
        const current = (q.domainsOf.all(e.tenantId) as { domain: string }[]).map((d) => d.domain);
        for (const d of current) if (!e.domains.includes(d)) q.delDomain.run(d, e.tenantId);
        for (const d of e.domains) q.addDomain.run(d, e.tenantId);
      });
    },
    /** Marca el dominio como verificado para esa empresa; `false` si otra empresa ya lo tiene verificado o no estaba reclamado. */
    verifyDomain(tenantId: string, domain: string): boolean {
      try {
        return Number(q.verifyDomain.run(stamp(), domain, tenantId).changes) === 1;
      } catch {
        return false; // el índice único parcial: otra empresa lo verificó antes
      }
    },
    deleteEnterprise(tenantId: string) {
      transaction(() => {
        q.delEnterprise.run(tenantId);
        q.delDomains.run(tenantId);
        q.delTenantIdentities.run(tenantId, `enterprise:${tenantId}`);
      });
    },

    addEvent: (e: { userId?: string; tenantId?: string; kind: string; detail?: string }) =>
      void q.addEvent.run(stamp(), e.userId ?? null, e.tenantId ?? null, e.kind, e.detail ?? null),
    events: (userId: string, limit = 50) => q.events.all(userId, limit) as Row[],
    schemaVersion: () => (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
    close: () => db.close(),
  };
}
