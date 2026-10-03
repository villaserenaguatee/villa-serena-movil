// Prueba del cliente HTTP con servidor y almacenamiento simulados, sin credenciales.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
async function scenario(mode) {
  let session = { accessToken: 'viejo', refreshToken: 'refresh-viejo' };
  let renewals = 0, cleared = 0;
  const calls = [];
  const exports = {};
  const sandbox = { exports, process: { env: { EXPO_PUBLIC_API_URL: 'http://api.test' } }, Headers,
    require: () => ({ readSession: async () => session, saveSession: async value => { session = value; }, clearSession: async () => { session = null; cleared++; }, tokensSchema: { parse: value => value } }),
    fetch: async (url, options) => {
      calls.push({ url, token: options.headers instanceof Headers ? options.headers.get('Authorization') : null });
      if (url.endsWith('/renovar')) {
        renewals++;
        await new Promise(resolve => setTimeout(resolve, 5));
        return new Response(JSON.stringify({ accessToken: 'nuevo', refreshToken: 'refresh-nuevo' }), { status: mode === 'fallo' ? 401 : 200 });
      }
      return new Response('{}', { status: mode === 'siempre401' || options.headers.get('Authorization') === 'Bearer viejo' ? 401 : 200 });
    },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/api/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  if (mode === 'concurrente') {
    const results = await Promise.all([exports.apiRequest('/uno'), exports.apiRequest('/dos')]);
    assert(results.every(response => response.status === 200));
    assert.equal(renewals, 1); assert.equal(session.refreshToken, 'refresh-nuevo');
  } else if (mode === 'fallo') {
    await assert.rejects(exports.apiRequest('/uno')); assert.equal(cleared, 1); assert.equal(calls.length, 2);
  } else {
    assert.equal((await exports.apiRequest('/uno')).status, 401);
    assert.equal(renewals, 1); assert.equal(cleared, 1); assert.equal(calls.length, 3);
  }
}
(async () => { for (const mode of ['concurrente', 'fallo', 'siempre401']) await scenario(mode); console.log('OK: renovación compartida, fallo y límite de un reintento.'); })().catch(error => { console.error(error); process.exitCode = 1; });
