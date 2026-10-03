const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
async function run() {
  const exports = {};
  const sandbox = { exports, require: name => {
    if (name === 'expo-constants') return { default: { executionEnvironment: 'storeClient' }, ExecutionEnvironment: { StoreClient: 'storeClient' } };
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    throw new Error(`No debe cargar ${name} en Expo Go.`);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/notificaciones/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  assert.equal(exports.notificationRoute({ pantalla: 'pedidos' }), '/pedidos');
  assert.equal(exports.notificationRoute({ pantalla: 'solicitudes' }), '/solicitudes');
  assert.equal(exports.notificationRoute({ pantalla: 'https://otro.test' }), null);
  assert.equal(exports.notificationRoute({}), null);
  const cleanup = await exports.listenNotificationResponses(() => { throw new Error('No debe navegar.'); });
  cleanup();
  await assert.rejects(exports.requestTestPushToken(), /Expo Go/);
  console.log('OK: rutas permitidas y notificaciones aisladas de Expo Go.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
