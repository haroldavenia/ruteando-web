#!/usr/bin/env node
// Valida la configuración de Antigravity del repo contra el formato documentado
// (antigravity.google/docs: rules, skills, subagents, mcp; consultado 2026-11-18).
// Evita que una regla sin `trigger` se descarte en silencio o que un subagente
// declare un `model` no admitido. Sin dependencias externas.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RULE_TRIGGERS = ['always_on', 'model_decision', 'glob', 'manual'];
export const AGENT_MODELS = ['inherit', 'flash', 'pro'];
export const COMMAND_POLICIES = ['off', 'auto', 'eager', 'sandbox'];
export const RULE_MAX_BYTES = 24000;

/** Frontmatter YAML mínimo: `clave: valor` y listas `- item`. */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/.exec(text);
  if (!m) return null;
  const data = {};
  let listKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const item = /^\s+-\s+(.*)$/.exec(raw);
    if (item && listKey) {
      data[listKey].push(unquote(item[1]));
      continue;
    }
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(raw);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '') {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = parseScalar(value);
      listKey = null;
    }
  }
  return data;
}

function unquote(v) {
  const t = v.trim();
  return /^(['"]).*\1$/.test(t) ? t.slice(1, -1) : t;
}

function parseScalar(v) {
  const t = unquote(v);
  if (t === 'true') return true;
  if (t === 'false') return false;
  const arr = /^\[(.*)\]$/.exec(t);
  if (arr) return arr[1].split(',').map((s) => unquote(s)).filter(Boolean);
  return t;
}

export function validateRule(file, text) {
  const errors = [];
  if (Buffer.byteLength(text) > RULE_MAX_BYTES) errors.push(`${file}: supera ${RULE_MAX_BYTES} bytes y se truncará`);
  const fm = parseFrontmatter(text);
  if (!fm) return [...errors, `${file}: falta frontmatter (Antigravity descarta la regla)`];
  if (!RULE_TRIGGERS.includes(fm.trigger)) errors.push(`${file}: trigger inválido "${fm.trigger}"`);
  if (fm.trigger === 'model_decision' && !fm.description) errors.push(`${file}: model_decision requiere description`);
  if (fm.trigger === 'glob' && !(fm.globs || fm.glob)) errors.push(`${file}: glob requiere globs`);
  return errors;
}

export function validateSkill(file, text, folderName) {
  const fm = parseFrontmatter(text);
  if (!fm) return [`${file}: falta frontmatter`];
  const errors = [];
  if (!fm.description) errors.push(`${file}: falta description`);
  if (fm.name && fm.name !== folderName) errors.push(`${file}: name "${fm.name}" no coincide con la carpeta "${folderName}"`);
  if (fm.name && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name)) errors.push(`${file}: name debe ser minúsculas con guiones`);
  return errors;
}

export function validateAgent(file, text, knownSkills = []) {
  const fm = parseFrontmatter(text);
  if (!fm) return [`${file}: falta frontmatter`];
  const errors = [];
  for (const k of ['name', 'description']) if (!fm[k]) errors.push(`${file}: falta ${k}`);
  if (fm.model !== undefined && !AGENT_MODELS.includes(fm.model)) errors.push(`${file}: model "${fm.model}" no es ${AGENT_MODELS.join('|')}`);
  if (fm.commandExecutionPolicy !== undefined && !COMMAND_POLICIES.includes(fm.commandExecutionPolicy)) {
    errors.push(`${file}: commandExecutionPolicy inválido "${fm.commandExecutionPolicy}"`);
  }
  for (const s of fm.skills ?? []) {
    if (!knownSkills.includes(s)) errors.push(`${file}: skill "${s}" no existe en .agents/`);
  }
  if (fm.tools !== undefined && !Array.isArray(fm.tools)) errors.push(`${file}: tools debe ser lista`);
  return errors;
}

export function validateMcp(file, text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return [`${file}: JSON inválido (${e.message})`];
  }
  if (!json || typeof json.mcpServers !== 'object' || Array.isArray(json.mcpServers)) return [`${file}: falta objeto mcpServers`];
  const errors = [];
  for (const [name, cfg] of Object.entries(json.mcpServers)) {
    if (cfg.httpUrl) errors.push(`${file}: ${name} usa httpUrl (no soportado; usar serverUrl)`);
    if (!cfg.command && !cfg.serverUrl && !cfg.url) errors.push(`${file}: ${name} necesita command o serverUrl`);
    if (cfg.env && Object.values(cfg.env).some((v) => typeof v === 'string' && v && !/^\$\{?[A-Z0-9_]+\}?$/.test(v))) {
      errors.push(`${file}: ${name} tiene valores literales en env; usar referencias a variables, nunca secretos`);
    }
  }
  return errors;
}

const listMd = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []);

export function validateRepo(root) {
  const errors = [];
  const base = path.join(root, '.agents');
  const read = (p) => readFileSync(p, 'utf8');
  if (!existsSync(path.join(root, 'AGENTS.md'))) errors.push('AGENTS.md: no existe');
  if (listMd(path.join(base, 'workflows')).length) errors.push('.agents/workflows: los workflows están deprecados en Antigravity; usar .agents/skills (ADR-0003)');
  for (const f of listMd(path.join(base, 'rules'))) errors.push(...validateRule(`.agents/rules/${f}`, read(path.join(base, 'rules', f))));
  const skillsDir = path.join(base, 'skills');
  const skills = existsSync(skillsDir) ? readdirSync(skillsDir).filter((d) => statSync(path.join(skillsDir, d)).isDirectory()).sort() : [];
  for (const d of skills) {
    const p = path.join(skillsDir, d, 'SKILL.md');
    if (!existsSync(p)) errors.push(`.agents/skills/${d}: falta SKILL.md`);
    else errors.push(...validateSkill(`.agents/skills/${d}/SKILL.md`, read(p), d));
  }
  const known = skills.map((d) => `skills/${d}`);
  for (const f of listMd(path.join(base, 'agents'))) errors.push(...validateAgent(`.agents/agents/${f}`, read(path.join(base, 'agents', f)), known));
  const mcp = path.join(base, 'mcp_config.json');
  if (existsSync(mcp)) errors.push(...validateMcp('.agents/mcp_config.json', read(mcp)));
  return errors;
}

export function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }) {
  const root = path.resolve(argv[0] ?? '.');
  const errors = validateRepo(root);
  if (errors.length) {
    io.err(errors.map((e) => `✖ ${e}`).join('\n') + '\n');
    return 1;
  }
  io.out('✔ Configuración de Antigravity válida\n');
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
