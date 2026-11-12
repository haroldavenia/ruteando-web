/**
 * Almacén SQLite (`node:sqlite`) del SSO: identidades enlazadas, política por empresa, proveedor OIDC de cada empresa (el secreto
 * llega ya cifrado) y un registro de eventos. Mismo patrón de migraciones que `mfa/store.js` (`PRAGMA user_version`).
 */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

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
];

function openStore(file, { now = () => new Date() } = {}) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
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
    domainsOf: db.prepare('SELECT domain FROM sso_enterprise_domain WHERE tenant_id = ? ORDER BY domain'),
    domainOwner: db.prepare('SELECT tenant_id FROM sso_enterprise_domain WHERE domain = ?'),
    addDomain: db.prepare('INSERT INTO sso_enterprise_domain (domain, tenant_id) VALUES (?, ?)'),
    delDomains: db.prepare('DELETE FROM sso_enterprise_domain WHERE tenant_id = ?'),
    addEvent: db.prepare('INSERT INTO sso_event (at, user_id, tenant_id, kind, detail) VALUES (?, ?, ?, ?, ?)'),
    events: db.prepare('SELECT * FROM sso_event WHERE user_id = ? ORDER BY id DESC LIMIT ?'),
  };

  const toIdentity = (r) =>
    r
      ? {
          provider: r.provider,
          subject: r.subject,
          userId: r.user_id,
          tenantId: r.tenant_id,
          email: r.email,
          createdAt: r.created_at,
          lastLoginAt: r.last_login_at,
        }
      : null;

  return {
    path: file,

    getIdentity: (provider, subject) => toIdentity(q.identity.get(provider, subject)),
    identitiesOf: (userId) => q.identitiesOf.all(userId).map(toIdentity),
    /** Enlaza (o actualiza el último acceso de) una identidad. */
    putIdentity(i) {
      const at = stamp();
      q.putIdentity.run(i.provider, i.subject, i.userId, i.tenantId, i.email, at, at);
    },
    /** Desenlaza todas las identidades de un proveedor de una persona; devuelve cuántas había. */
    deleteIdentities: (userId, provider) => q.delIdentities.run(userId, provider).changes,
    /** Desenlaza un proveedor para todas las personas de una empresa. */
    deleteProviderIdentities: (tenantId, provider) => q.delTenantIdentities.run(tenantId, provider).changes,

    /** Por defecto el SSO está permitido; el administrador lo apaga por empresa. */
    getPolicy(tenantId) {
      const r = q.policy.get(tenantId);
      return { tenantId, enabled: r ? r.enabled === 1 : true };
    },
    setPolicy: (policy) => void q.putPolicy.run(policy.tenantId, policy.enabled ? 1 : 0, stamp()),

    getEnterprise(tenantId) {
      const r = q.enterprise.get(tenantId);
      if (!r) return null;
      return {
        tenantId,
        name: r.name,
        issuer: r.issuer,
        clientId: r.client_id,
        secretEnc: r.secret_enc,
        domains: q.domainsOf.all(tenantId).map((d) => d.domain),
      };
    },
    /** Dueña de un dominio de correo, o `null`. */
    domainOwner: (domain) => q.domainOwner.get(domain)?.tenant_id ?? null,
    /** Guarda el proveedor de la empresa y sustituye sus dominios; el llamador ya comprobó que no son de otra empresa. */
    putEnterprise(e) {
      db.exec('BEGIN');
      try {
        q.putEnterprise.run(e.tenantId, e.name, e.issuer, e.clientId, e.secretEnc ?? null, stamp());
        q.delDomains.run(e.tenantId);
        for (const d of e.domains) q.addDomain.run(d, e.tenantId);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    deleteEnterprise(tenantId) {
      db.exec('BEGIN');
      try {
        q.delEnterprise.run(tenantId);
        q.delDomains.run(tenantId);
        q.delTenantIdentities.run(tenantId, `enterprise:${tenantId}`);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    addEvent: (e) => void q.addEvent.run(stamp(), e.userId ?? null, e.tenantId ?? null, e.kind, e.detail ?? null),
    events: (userId, limit = 50) => q.events.all(userId, limit),
    schemaVersion: () => db.prepare('PRAGMA user_version').get().user_version,
    close: () => db.close(),
  };
}

module.exports = { openStore };
