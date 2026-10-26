const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { setup, tokens, error } = require('./simulador-api.cjs');
const modules = {};
function load(name) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`lib/mocks/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, Intl, require: () => modules.cuenta });
  return exports;
}
modules.cuenta = load('cuenta');
const service = load('servicios');
(async () => {
  await assert.rejects(service.placeOrder({}, ''), /al menos/);
  await assert.rejects(service.placeOrder({ m4: 1 }, ''), /agotado/);
  await service.placeOrder({ m1: 1, m3: 1 }, 'Sin azúcar');
  const orders = await service.getOrders();
  assert.equal(orders.at(-1).date, modules.cuenta.DEMO_NOW);
  assert.equal(orders.at(-1).cents, 10000); assert.equal(orders.at(-1).status, 'NUEVO');
  assert.equal(modules.cuenta.balance(await modules.cuenta.getAccount()), 12500); // No cobra al crear.
  await modules.cuenta.startMockPayment(); await modules.cuenta.approveMockPayment();
  await modules.cuenta.confirmMockCheckout('Ana', 'CF', true);
  await assert.rejects(service.placeOrder({ m1: 1 }, ''), /estadía/);
  console.log('OK: carrito de prueba, agotados y estadía finalizada.');

  const base = '/api/v1/app/reservas/VS-BBBBBB';
  const solicitud = { id: 7, tipo: 'ARTICULOS', creadaEn: '2026-10-26T15:00:00Z', estado: 'PENDIENTE', comentario: null, articulos: [{ articuloId: 1, nombre: 'Toalla', cantidad: 2 }] };
  let limpiezas = 0;
  const { state, load: cargar } = setup(async (path, options) => {
    if (path === `${base}/solicitudes/limpieza`) return ++limpiezas > 1 ? [409, error('LIMPIEZA_EN_CURSO', 'Ya hay una solicitud de limpieza en curso para tu habitación.')] : [201, { ...solicitud, id: 8, tipo: 'LIMPIEZA', articulos: [] }];
    if (path === `${base}/solicitudes/articulos`) return [201, solicitud];
    if (path === `${base}/solicitudes/7/cancelar`) return [200, { ...solicitud, estado: 'CANCELADA' }];
    if (path === `${base}/solicitudes/9/cancelar`) return [409, error('SOLICITUD_NO_CANCELABLE', 'Solo puedes cancelar solicitudes pendientes.')];
    return [404, error('NO_ENCONTRADO', `Ruta no simulada ${options.method} ${path}`)];
  });
  state.session = tokens;
  const solicitudes = cargar('lib/api/solicitudes');
  await solicitudes.solicitarLimpieza('VS-BBBBBB', '  ');
  assert.deepEqual(state.calls.at(-1).body, {}, 'el comentario vacío no se envía');
  await assert.rejects(solicitudes.solicitarLimpieza('VS-BBBBBB', 'Después de las 2:00 PM'), /en curso/);
  assert.deepEqual(state.calls.at(-1).body, { comentario: 'Después de las 2:00 PM' });
  await solicitudes.solicitarArticulos('VS-BBBBBB', { 1: 2, 3: 0 });
  assert.deepEqual(state.calls.at(-1).body, { articulos: [{ articuloId: 1, cantidad: 2 }] });
  assert.equal(solicitudes.describirSolicitud(solicitud), 'Toalla × 2');
  assert.equal((await solicitudes.cancelarSolicitud('VS-BBBBBB', 7)).estado, 'CANCELADA');
  assert.equal(state.calls.at(-1).method, 'POST');
  await assert.rejects(solicitudes.cancelarSolicitud('VS-BBBBBB', 9), /pendientes/);
  assert(state.calls.every(call => call.token === 'Bearer jwt'));
  console.log('OK: limpieza con comentario opcional y 409 en curso, artículos con cantidades y cancelación solo de pendientes.');
})().catch(cause => { console.error(cause); process.exitCode = 1; });
