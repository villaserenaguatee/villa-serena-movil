const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsMock = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/mocks/cuenta.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exportsMock, Intl, Date });
const { initialAccount, balance, checkoutBlock, validNit, getAccount, startMockPayment, approveMockPayment, confirmMockCheckout } = exportsMock;
assert.equal(balance(initialAccount), 12500);
assert.equal(balance({ ...initialAccount, payments: [...initialAccount.payments, { cents: 99900, status: 'REEMBOLSADO' }, { cents: 8000, status: 'PENDIENTE' }] }), 12500);
assert.equal(checkoutBlock(initialAccount, new Date('2026-10-08T06:00:00Z')), null);
assert.equal(checkoutBlock(initialAccount, new Date('2026-10-08T18:00:00Z')), null);
assert(checkoutBlock(initialAccount, new Date('2026-10-08T18:00:01Z')));
assert(checkoutBlock(initialAccount, new Date('2026-10-08T05:59:59Z')));
assert(checkoutBlock({ ...initialAccount, reservation: 'CONFIRMADA' }, new Date('2026-10-08T16:00:00Z')));
assert(checkoutBlock({ ...initialAccount, orders: [{ status: 'EN_CAMINO' }] }, new Date('2026-10-08T16:00:00Z')));
assert(validNit('1234567-9')); assert(validNit('576937-K')); assert(!validNit('1234567-5')); assert(!validNit('000-0')); assert(!validNit('abc'));
(async () => {
  await assert.rejects(confirmMockCheckout('Ana', 'CF', true));
  await startMockPayment(); await startMockPayment();
  let account = await getAccount();
  assert.equal(account.payments.filter(p => p.id === 'p-demo').length, 1);
  assert.equal(balance(account), 12500); // No cuenta hasta la confirmación.
  await approveMockPayment(); assert.equal(balance(await getAccount()), 0);
  await assert.rejects(confirmMockCheckout('Ana', '1234567-5', true));
  await assert.rejects(confirmMockCheckout('Ana', 'CF', false));
  assert.equal(balance(await getAccount()), 0); // No cobra de nuevo al reintentar.
  account = await confirmMockCheckout('Ana', 'CF', true);
  assert.equal(account.reservation, 'FINALIZADA'); assert.equal(account.status, 'CERRADA');
  assert.equal(account.orders[0].status, 'CANCELADO'); assert.equal(account.invoice.nit, 'CF');
  console.log('OK: saldo, horario Guatemala, pedidos, NIT y check-out sin doble cobro.');
})().catch(error => { console.error(error); process.exitCode = 1; });
