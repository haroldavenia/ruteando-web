/**
 * Almacén SQLite (`node:sqlite`) del segundo factor: política por empresa, factores por persona, códigos de recuperación (solo
 * huellas) y un registro de eventos. El esquema se crea al abrir y se migra con `PRAGMA user_version`. No guarda secretos en claro:
 * el cifrado y las huellas los pone quien llama (crypto.ts). Mismo esquema que server/mfa/store.js: el archivo es intercambiable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const METHODS = ['email', 'sms', 'totp'] as const;
export const REQUIRED_MODES = ['none', 'all', 'roles'] as const;
export type Method = (typeof METHODS)[number];
export type RequiredMode = (typeof REQUIRED_MODES)[number];

export interface Policy {
  tenantId: string;
  methods: Record<Method, boolean>;
  required: RequiredMode;
  roles: string[];
}

export interface Factor {
  userId: string;
  type: string;
  tenantId: string;
  secretEnc?: string | null;
  destination?: string | null;
  verified: boolean;
  lastStep?: number | null;
}

export type Store = ReturnType<typeof openStore>;

// Cada entrada sube `user_version` en uno; nunca se edita una ya publicada, se añade otra.
const MIGRATIONS = [
  `
  CREATE TABLE tenant_policy (
    tenant_id TEXT PRIMARY KEY,
    email_enabled INTEGER NOT NULL DEFAULT 1,
    sms_enabled INTEGER NOT NULL DEFAULT 1,
    totp_enabled INTEGER NOT NULL DEFAULT 1,
    required TEXT NOT NULL DEFAULT 'none',
    roles TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE factor (
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    secret_enc TEXT,
    destination TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    last_step INTEGER,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, type)
  );
  CREATE INDEX factor_tenant ON factor (tenant_id);
  CREATE TABLE recovery_code (
    user_id TEXT NOT NULL,
    hash TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, hash)
  );
  CREATE TABLE mfa_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    user_id TEXT,
    tenant_id TEXT,
    kind TEXT NOT NULL,
    detail TEXT
  );
  `,
];

export const defaultPolicy = (tenantId: string): Policy => ({
  tenantId,
  methods: { email: true, sms: true, totp: true },
  required: 'none',
  roles: [],
});

/** Abre (y crea si falta) el almacén. `file` puede ser `:memory:` en las pruebas. */
export function openStore(file: string, { now = () => new Date() }: { now?: () => Date } = {}) {
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
    getPolicy: db.prepare('SELECT * FROM tenant_policy WHERE tenant_id = ?'),
    putPolicy: db.prepare(
      `INSERT INTO tenant_policy (tenant_id, email_enabled, sms_enabled, totp_enabled, required, roles, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id) DO UPDATE SET email_enabled = excluded.email_enabled, sms_enabled = excluded.sms_enabled,
         totp_enabled = excluded.totp_enabled, required = excluded.required, roles = excluded.roles, updated_at = excluded.updated_at`
    ),
    factors: db.prepare('SELECT * FROM factor WHERE user_id = ?'),
    factor: db.prepare('SELECT * FROM factor WHERE user_id = ? AND type = ?'),
    putFactor: db.prepare(
      `INSERT INTO factor (user_id, type, tenant_id, secret_enc, destination, verified, last_step, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, type) DO UPDATE SET tenant_id = excluded.tenant_id, secret_enc = excluded.secret_enc,
         destination = excluded.destination, verified = excluded.verified, last_step = excluded.last_step`
    ),
    setLastStep: db.prepare('UPDATE factor SET last_step = ? WHERE user_id = ? AND type = ?'),
    delFactor: db.prepare('DELETE FROM factor WHERE user_id = ? AND type = ?'),
    delFactors: db.prepare('DELETE FROM factor WHERE user_id = ?'),
    delRecovery: db.prepare('DELETE FROM recovery_code WHERE user_id = ?'),
    addRecovery: db.prepare('INSERT OR IGNORE INTO recovery_code (user_id, hash, used) VALUES (?, ?, 0)'),
    useRecovery: db.prepare('UPDATE recovery_code SET used = 1 WHERE user_id = ? AND hash = ? AND used = 0'),
    recoveryLeft: db.prepare('SELECT COUNT(*) AS n FROM recovery_code WHERE user_id = ? AND used = 0'),
    addEvent: db.prepare('INSERT INTO mfa_event (at, user_id, tenant_id, kind, detail) VALUES (?, ?, ?, ?, ?)'),
    events: db.prepare('SELECT * FROM mfa_event WHERE user_id = ? ORDER BY id DESC LIMIT ?'),
    usersWithFactors: db.prepare('SELECT DISTINCT user_id FROM factor WHERE tenant_id = ? AND verified = 1'),
  };

  type Row = Record<string, string | number | null>;
  const toFactor = (r: Row | undefined): Factor | null =>
    r
      ? {
          userId: r.user_id as string,
          type: r.type as string,
          tenantId: r.tenant_id as string,
          secretEnc: r.secret_enc as string | null,
          destination: r.destination as string | null,
          verified: r.verified === 1,
          lastStep: r.last_step as number | null,
        }
      : null;

  return {
    path: file,

    getPolicy(tenantId: string): Policy {
      const r = q.getPolicy.get(tenantId) as Row | undefined;
      if (!r) return defaultPolicy(tenantId);
      return {
        tenantId,
        methods: { email: r.email_enabled === 1, sms: r.sms_enabled === 1, totp: r.totp_enabled === 1 },
        required: r.required as RequiredMode,
        roles: JSON.parse(r.roles as string),
      };
    },

    /** Guarda la política tal cual; la validación (p. ej. obligatoria sin métodos) es de quien llama. */
    setPolicy(policy: Policy) {
      q.putPolicy.run(
        policy.tenantId,
        policy.methods.email ? 1 : 0,
        policy.methods.sms ? 1 : 0,
        policy.methods.totp ? 1 : 0,
        policy.required,
        JSON.stringify(policy.roles || []),
        stamp()
      );
    },

    getFactors: (userId: string) => (q.factors.all(userId) as Row[]).map((r) => toFactor(r)!),
    getFactor: (userId: string, type: string) => toFactor(q.factor.get(userId, type) as Row | undefined),

    putFactor(f: Factor) {
      q.putFactor.run(
        f.userId,
        f.type,
        f.tenantId,
        f.secretEnc ?? null,
        f.destination ?? null,
        f.verified ? 1 : 0,
        f.lastStep ?? null,
        stamp()
      );
    },

    setLastStep: (userId: string, type: string, step: number) => void q.setLastStep.run(step, userId, type),
    deleteFactor: (userId: string, type: string) => void q.delFactor.run(userId, type),

    /** Borra todos los factores y códigos de una persona (restablecimiento por un administrador). */
    resetUser(userId: string) {
      q.delFactors.run(userId);
      q.delRecovery.run(userId);
    },

    /** Sustituye los códigos de recuperación por estas huellas. */
    replaceRecoveryCodes(userId: string, hashes: string[]) {
      db.exec('BEGIN');
      try {
        q.delRecovery.run(userId);
        for (const h of hashes) q.addRecovery.run(userId, h);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    /** Gasta un código de recuperación; `true` solo si existía y no estaba usado. */
    consumeRecoveryCode: (userId: string, hash: string) => Number(q.useRecovery.run(userId, hash).changes) === 1,
    recoveryCodesLeft: (userId: string) => (q.recoveryLeft.get(userId) as { n: number }).n,

    addEvent: (e: { userId?: string; tenantId?: string; kind: string; detail?: string }) =>
      void q.addEvent.run(stamp(), e.userId ?? null, e.tenantId ?? null, e.kind, e.detail ?? null),
    events: (userId: string, limit = 50) => q.events.all(userId, limit) as Row[],
    usersWithFactors: (tenantId: string) => (q.usersWithFactors.all(tenantId) as { user_id: string }[]).map((r) => r.user_id),

    schemaVersion: () => (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
    close: () => db.close(),
  };
}
