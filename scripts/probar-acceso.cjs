// Prueba lib/api/huesped.ts con servidor y SecureStore simulados, sin credenciales.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const load = (file, sandbox) => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Headers, ...sandbox });
  return exports;
};
function setup(routes) {
  const state = { session: null, cleared: 0, calls: [] };
  const sesion = {
    readSession: async () => state.session, saveSession: async value => { state.session = value; },
    clearSession: async () => { state.session = null; state.cleared++; }, tokensSchema: { parse: value => { assert.equal(value.tipoToken, 'Bearer'); return value; } },
  };
  const fetch = async (url, options) => {
    const path = url.replace('http://api.test', '');
    state.calls.push({ path, method: options.method, token: new Headers(options.headers).get('Authorization'), body: options.body && JSON.parse(options.body) });
    const [status, body] = await routes(path, options);
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  };
  const api = load('lib/api/index.ts', { process: { env: { EXPO_PUBLIC_API_URL: 'http://api.test/' } }, fetch, require: () => sesion });
  const huesped = load('lib/api/huesped.ts', { require: name => (name === '../sesion' ? sesion : api) });
  return { state, api, huesped };
}
const tokens = { accessToken: 'jwt', refreshToken: 'refresh', tipoToken: 'Bearer', expiraEn: 900 };
const generic = { mensaje: 'Si el correo tiene reservas, recibirás un código para entrar.' };
(async () => {
  {
    const { state, huesped } = setup(async path => {
      if (path === '/api/v1/app/acceso/solicitar-codigo') return [200, generic];
      if (path === '/api/v1/app/acceso/verificar-codigo') return [200, tokens];
      if (path === '/api/v1/app/reservas') return [200, [{ codigo: 'VS-AAAAAA', entrada: '2026-11-01', salida: '2026-11-03', estado: 'CONFIRMADA' }, { codigo: 'VS-BBBBBB', entrada: '2026-10-25', salida: '2026-10-27', estado: 'EN_ESTADIA' }]];
      if (path === '/api/v1/app/cerrar-sesion') return [204];
      return [404, { codigo: 'NO_ENCONTRADO', mensaje: 'No encontrado.', detalles: [] }];
    });
    assert.equal(await huesped.solicitarCodigo('ana@example.com'), generic.mensaje);
    assert.equal(state.calls[0].token, null);
    await huesped.verificarCodigo('ana@example.com', '123456');
    assert.deepEqual(state.calls[1].body, { correo: 'ana@example.com', codigo: '123456' });
    assert.equal(state.session.accessToken, 'jwt');
    const reservas = await huesped.listarReservas();
    assert.equal(state.calls[2].token, 'Bearer jwt');
    assert.deepEqual(JSON.parse(JSON.stringify(huesped.destinoTrasAcceso(reservas))), { pathname: '/estadia', params: { codigo: 'VS-BBBBBB' } });
    assert.equal(huesped.destinoTrasAcceso(reservas.slice(0, 1)), '/reservas');
    assert.equal(huesped.destinoTrasAcceso([]), '/reservas');
    await huesped.cerrarSesion();
    assert.deepEqual(state.calls.at(-1).body, { refreshToken: 'refresh' });
    assert.equal(state.session, null);
    console.log('OK: código, tokens guardados, reservas con Bearer, destino tras acceso y cierre de sesión.');
  }
  {
    const { state, api, huesped } = setup(async () => [401, { codigo: 'ACCESO_BLOQUEADO', mensaje: 'El acceso está bloqueado por 15 minutos. Intenta más tarde.', detalles: [] }]);
    await assert.rejects(huesped.verificarCodigo('ana@example.com', '000000'), error => error instanceof api.ApiError && error.codigo === 'ACCESO_BLOQUEADO' && /15 minutos/.test(error.message));
    assert.equal(state.session, null);
    assert.equal(state.calls.length, 1, 'un 401 del acceso no intenta renovar');
    console.log('OK: errores del contrato llegan con su código y mensaje, sin renovar ni guardar tokens.');
  }
  {
    const { state, huesped } = setup(async () => { throw new TypeError('Network request failed'); });
    state.session = tokens;
    await huesped.cerrarSesion();
    assert.equal(state.session, null);
    await assert.rejects(huesped.solicitarCodigo('ana@example.com'), /No pudimos conectar/);
    console.log('OK: sin red el cierre de sesión borra los tokens y el acceso informa la falta de conexión.');
  }
  {
    const { state, huesped } = setup(async path => [401, { codigo: 'SESION_VENCIDA', mensaje: 'Tu sesión venció.', detalles: [] }]);
    state.session = tokens;
    await assert.rejects(huesped.listarReservas(), /sesión venció/);
    assert.equal(state.session, null);
    console.log('OK: refresh rechazado cierra la sesión local.');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
