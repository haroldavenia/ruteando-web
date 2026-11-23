import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parseFrontmatter, validateRule, validateSkill, validateAgent, validateMcp, validateRepo, main, RULE_MAX_BYTES,
} from '../validate-harness.mjs';

test('parseFrontmatter: escalares, listas, booleanos y arreglos en línea', () => {
  const fm = parseFrontmatter('---\nname: x\n# comentario\nmainAgent: false\nsub: true\ntools:\n  - view_file\n  - "run_command"\nglobs: [a/**, "b"]\nraro\n---\ncuerpo');
  assert.deepEqual(fm, { name: 'x', mainAgent: false, sub: true, tools: ['view_file', 'run_command'], globs: ['a/**', 'b'] });
  assert.equal(parseFrontmatter('sin frontmatter'), null);
});

test('validateRule', () => {
  assert.deepEqual(validateRule('r.md', '---\ntrigger: always_on\n---\nx'), []);
  assert.match(validateRule('r.md', 'x')[0], /falta frontmatter/);
  assert.match(validateRule('r.md', '---\ntrigger: siempre\n---\n')[0], /trigger inválido/);
  assert.match(validateRule('r.md', '---\ntrigger: model_decision\n---\n')[0], /description/);
  assert.match(validateRule('r.md', '---\ntrigger: glob\n---\n')[0], /globs/);
  assert.deepEqual(validateRule('r.md', '---\ntrigger: glob\nglobs: "**/*.js"\n---\n'), []);
  assert.match(validateRule('r.md', '---\ntrigger: manual\n---\n' + 'a'.repeat(RULE_MAX_BYTES))[0], /truncará/);
});

test('validateSkill', () => {
  assert.deepEqual(validateSkill('s', '---\nname: abrir-pr\ndescription: d\n---', 'abrir-pr'), []);
  assert.deepEqual(validateSkill('s', '---\ndescription: d\n---', 'x'), []);
  assert.match(validateSkill('s', 'x', 'x')[0], /frontmatter/);
  const errs = validateSkill('s', '---\nname: Otra_Cosa\n---', 'x');
  assert.equal(errs.length, 3);
});

test('validateAgent', () => {
  const ok = '---\nname: a\ndescription: d\nmodel: pro\ncommandExecutionPolicy: sandbox\nskills:\n  - skills/x\ntools:\n  - view_file\n---';
  assert.deepEqual(validateAgent('a', ok, ['skills/x']), []);
  assert.match(validateAgent('a', 'x')[0], /frontmatter/);
  const bad = validateAgent('a', '---\nmodel: gpt\ncommandExecutionPolicy: nunca\nskills: [skills/y]\ntools: view_file\n---', []);
  assert.equal(bad.length, 6);
});

test('validateMcp', () => {
  assert.deepEqual(validateMcp('m', '{"mcpServers":{"a":{"command":"x","env":{"T":"${TOKEN}"}},"b":{"serverUrl":"https://x"}}}'), []);
  assert.match(validateMcp('m', '{')[0], /JSON inválido/);
  assert.match(validateMcp('m', '{"mcpServers":[]}')[0], /mcpServers/);
  const errs = validateMcp('m', '{"mcpServers":{"a":{"httpUrl":"h"},"b":{"command":"x","env":{"T":"secreto123"}}}}');
  assert.equal(errs.length, 3);
});

function makeRepo(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'harness-'));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

test('validateRepo y main: repositorio válido e inválido', () => {
  const good = makeRepo({
    'AGENTS.md': '# x',
    '.agents/rules/a.md': '---\ntrigger: always_on\n---\n',
    '.agents/skills/abrir-pr/SKILL.md': '---\nname: abrir-pr\ndescription: d\n---',
    '.agents/agents/x.md': '---\nname: x\ndescription: d\nmodel: inherit\nskills:\n  - skills/abrir-pr\n---',
    '.agents/mcp_config.json': '{"mcpServers":{"m":{"command":"c"}}}',
  });
  assert.deepEqual(validateRepo(good), []);
  const out = [];
  assert.equal(main([good], { out: (t) => out.push(t), err: () => {} }), 0);
  assert.match(out.join(''), /válida/);

  const bad = makeRepo({ '.agents/skills/vacia/README.md': 'x', '.agents/rules/b.md': 'sin fm' });
  const errs = validateRepo(bad);
  assert.equal(errs.length, 3);
  const err = [];
  assert.equal(main([bad], { out: () => {}, err: (t) => err.push(t) }), 1);
  assert.match(err.join(''), /AGENTS\.md/);
  assert.deepEqual(validateRepo(makeRepo({ 'AGENTS.md': 'x' })), []);
});

test('validateRepo rechaza .agents/workflows (deprecados)', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'wf-'));
  writeFileSync(path.join(root, 'AGENTS.md'), '# x');
  mkdirSync(path.join(root, '.agents', 'workflows'), { recursive: true });
  writeFileSync(path.join(root, '.agents', 'workflows', 'a.md'), '---\ndescription: d\n---');
  assert.match(validateRepo(root).join('\n'), /workflows están deprecados/);
});
