const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
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
  await service.requestCleaning('Por favor');
  await assert.rejects(service.requestCleaning('Otra'), /en curso/);
  await assert.rejects(service.requestArticles({ toalla: 5 }), /máximas/);
  await service.requestArticles({ toalla: 4 });
  let requests = await service.getRequests(); assert.equal(requests.length, 2);
  assert(requests.every(value => value.date === modules.cuenta.DEMO_NOW));
  await service.cancelRequest(requests[0].id);
  await assert.rejects(service.cancelRequest(requests[0].id), /pendientes/);
  await service.requestCleaning('Nueva');
  requests = await service.getRequests(); assert.equal(requests.length, 3);
  assert.equal(new Set(requests.map(value => value.id)).size, 3);
  await modules.cuenta.startMockPayment(); await modules.cuenta.approveMockPayment();
  await modules.cuenta.confirmMockCheckout('Ana', 'CF', true);
  await assert.rejects(service.placeOrder({ m1: 1 }, ''), /estadía/);
  await assert.rejects(service.requestCleaning(''), /estadía/);
  assert((await service.getRequests()).every(value => value.status === 'CANCELADA'));
  console.log('OK: carrito, agotados, limpieza duplicada, máximos, cancelación y estadía finalizada.');
})().catch(error => { console.error(error); process.exitCode = 1; });
