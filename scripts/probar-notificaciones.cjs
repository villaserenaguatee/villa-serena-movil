const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { setup, tokens, error, plain } = require('./simulador-api.cjs');
async function run() {
  const exports = {};
  const sandbox = { exports, require: name => {
    if (name === 'expo-constants') return { default: { executionEnvironment: 'storeClient' }, ExecutionEnvironment: { StoreClient: 'storeClient' } };
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    throw new Error(`No debe cargar ${name} en Expo Go.`);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/notificaciones/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  assert.deepEqual(plain(exports.notificationRoute({ pantalla: 'pedidos', codigoReserva: 'VS-ABC123', pedidoId: 12 })), { pathname: '/pedidos', params: { codigo: 'VS-ABC123' } });
  assert.deepEqual(plain(exports.notificationRoute({ pantalla: 'solicitudes' })), { pathname: '/solicitudes', params: {} });
  assert.deepEqual(plain(exports.notificationRoute({ pantalla: 'pedidos', codigoReserva: '../otra' })), { pathname: '/pedidos', params: {} }, 'código inválido se ignora');
  assert.equal(exports.notificationRoute({ pantalla: 'https://otro.test' }), null);
  assert.equal(exports.notificationRoute({}), null);
  const cleanup = await exports.listenNotificationResponses(() => { throw new Error('No debe navegar.'); });
  cleanup();
  await assert.rejects(exports.obtenerTokenPush(), /Expo Go/);
  console.log('OK: rutas de x-push con código de reserva y notificaciones aisladas de Expo Go.');

  const { state, load } = setup(async (path, options) => {
    if (path === '/api/v1/app/dispositivos-push' && options.method === 'POST') return [201, { id: 31 }];
    if (path === '/api/v1/app/dispositivos-push/31' && options.method === 'DELETE') return [204];
    if (path === '/api/v1/app/cerrar-sesion') return [204];
    return [404, error('NO_ENCONTRADO', `Ruta no simulada ${options.method} ${path}`)];
  });
  state.session = tokens;
  const push = load('lib/api/push');
  assert.equal(await push.registrarDispositivo(), null, 'sin permiso o en Expo Go la app sigue sin registrar');
  assert.equal(state.calls.length, 0);
  state.pushToken = 'ExponentPushToken[abc]';
  assert.equal(await push.registrarDispositivo(), 31);
  assert.deepEqual(state.calls.at(-1).body, { tokenExpo: 'ExponentPushToken[abc]' });
  assert.equal(state.calls.at(-1).token, 'Bearer jwt');
  assert.equal(state.store.get('villaserena.push'), '31');
  await load('lib/api/huesped').cerrarSesion();
  assert.deepEqual(state.calls.slice(-2).map(call => `${call.method} ${call.path}`), ['DELETE /api/v1/app/dispositivos-push/31', 'POST /api/v1/app/cerrar-sesion']);
  assert.equal(state.store.has('villaserena.push'), false);
  assert.equal(state.session, null);
  state.store.set('villaserena.push', '31');
  await push.olvidarDispositivo();
  assert.equal(state.store.has('villaserena.push'), false, 'tras el check-out solo se olvida el id local');
  console.log('OK: token registrado con el JWT del huésped, baja al cerrar sesión y olvido tras el check-out.');
}
run().catch(cause => { console.error(cause); process.exitCode = 1; });
