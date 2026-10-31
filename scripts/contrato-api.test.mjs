import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { invocation, verifyCheckout } from './contrato-api.mjs';

const revision = 'a'.repeat(40);
test('el contrato exige SHA fijo y rechaza un checkout distinto', () => {
  assert.throws(() => verifyCheckout('/docs', revision, args => args[0] === 'rev-parse' ? `${'b'.repeat(40)}\n` : ''), /esperado a{40}, recibido b{40}/);
});
test('el diagnóstico identifica los archivos modificados sin omitir la guarda', () => {
  assert.throws(() => verifyCheckout('/docs', revision, args => args[0] === 'rev-parse' ? revision : ' M pnpm-lock.yaml\n'), /cambios.*\nM pnpm-lock.yaml/s);
});
test('un checkout con el SHA correcto también debe conservar los bytes del YAML', t => {
  const directory = mkdtempSync(join(tmpdir(), 'movil-contrato-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, 'openapi.yaml'), 'openapi: 3.1.0\n');
  const git = args => args[0] === 'rev-parse' ? revision : args[0] === 'status' ? '' : Buffer.from('openapi: 3.1.0\n');
  assert.doesNotThrow(() => verifyCheckout(directory, revision, git));
  writeFileSync(join(directory, 'openapi.yaml'), 'openapi: 3.1.0\r\n');
  assert.throws(() => verifyCheckout(directory, revision, git), /bytes.*difieren/);
});
test('la invocación de CI usa el checkout indicado y conserva --check y el SHA', () => {
  const plan = invocation(['--check'], { API_CONTRACT_DOCS_DIR: '/docs' });
  assert.equal(plan.docs, '/docs');
  assert.equal(plan.args.at(-1), '--check');
  assert.match(plan.args[plan.args.indexOf('--revision') + 1], /^[a-f0-9]{40}$/);
});
