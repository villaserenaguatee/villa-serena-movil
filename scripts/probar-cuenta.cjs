// Prueba NIT y el cliente de check-out con servidor y navegador simulados, sin credenciales.
const assert = require('node:assert/strict');
const { setup, tokens, error } = require('./simulador-api.cjs');
(async () => {
  const { validarNit, normalizarNit } = setup(async () => [404]).load('lib/nit');
  assert(validarNit('1234567-9')); assert(validarNit('576937-K')); assert(validarNit('576937-k'));
  assert(!validarNit('1234567-5')); assert(!validarNit('000-0')); assert(!validarNit('abc')); assert(!validarNit('CF'));
  assert.equal(normalizarNit(' 576937 - k '), '576937-K');
  console.log('OK: NIT con dígito verificador, K y formato del contrato.');

  const base = '/api/v1/app/reservas/VS-BBBBBB';
  let consultas = 0; let saldoCero = false;
  const abiertos = [];
  const { state, load } = setup(async (path, options) => {
    if (path === `${base}/pago-saldo` && options.method === 'POST') return saldoCero ? [204] : [200, { urlPago: 'https://pagos.test/abc', expiraEn: null }];
    if (path === `${base}/pago-saldo/estado`) return [200, { estadoPago: ++consultas < 3 ? 'PENDIENTE' : 'APROBADO', estadoCheckout: consultas < 3 ? 'PROCESANDO' : 'PAGADO', accionPago: consultas < 3 ? 'ESPERAR' : 'NINGUNA', puedeReintentar: false, urlPago: null, expiraEn: null }];
    if (path === `${base}/checkout` && options.method === 'POST') return JSON.parse(options.body).aceptaCancelarPedidos ? [200, { codigoReserva: 'VS-BBBBBB', estadoReserva: 'FINALIZADA', estadoCuenta: 'CERRADA', saldo: 0, factura: { id: 5 } }] : [409, error('CONSENTIMIENTO_REQUERIDO', 'Debes aceptar la cancelación de tus pedidos pendientes.')];
    if (path === `${base}/factura`) return [404, error('FACTURA_NO_EMITIDA', 'La factura aún no existe.')];
    if (path === '/api/v1/facturas/5/pdf') return [200, { url: 'http://minio.test/factura.pdf?firma=x', expiraEn: '2026-10-26T16:05:00Z' }];
    return [404, error('NO_ENCONTRADO', `Ruta no simulada ${options.method} ${path}`)];
  }, {
    'expo-linking': { createURL: path => `villaserena://${path}` },
    'expo-web-browser': { openAuthSessionAsync: async (url, retorno) => { abiertos.push([url, retorno]); return { type: 'success' }; } },
  });
  state.session = tokens;
  const checkout = load('lib/api/checkout');
  const pago = await checkout.iniciarPagoSaldo('VS-BBBBBB');
  assert.equal(state.calls.at(-1).body, undefined, 'el pago no envía monto ni tarjeta');
  await checkout.abrirPasarela(pago.urlPago);
  assert.deepEqual(abiertos, [['https://pagos.test/abc', 'villaserena://checkout']]);
  const proceso = await checkout.esperarAcreditacion('VS-BBBBBB', 10, 1);
  assert.equal(proceso.estadoPago, 'APROBADO'); assert.equal(consultas, 3, 'consulta mientras la acción sea ESPERAR');
  consultas = 0;
  assert.equal((await checkout.esperarAcreditacion('VS-BBBBBB', 2, 1)).accionPago, 'ESPERAR', 'respeta el límite de consultas');
  saldoCero = true;
  assert.equal(await checkout.iniciarPagoSaldo('VS-BBBBBB'), undefined, 'saldo cero responde 204 sin sesión de pago');
  await assert.rejects(checkout.confirmarCheckout('VS-BBBBBB', { nit: 'CF', nombreComprador: 'Ana' }, false), /aceptar la cancelación/);
  const resultado = await checkout.confirmarCheckout('VS-BBBBBB', { nit: '576937-K', nombreComprador: 'Ana Morales' }, true);
  assert.deepEqual(state.calls.at(-1).body, { comprador: { nit: '576937-K', nombreComprador: 'Ana Morales' }, aceptaCancelarPedidos: true });
  assert.equal(resultado.estadoReserva, 'FINALIZADA');
  await assert.rejects(checkout.consultarFactura('VS-BBBBBB'), /aún no existe/);
  assert.match((await checkout.enlaceFacturaPdf(5)).url, /firma/);
  assert(state.calls.every(call => call.token === 'Bearer jwt'));
  console.log('OK: pago en Recurrente con retorno villaserena://, espera de acreditación, saldo cero, consentimiento, check-out y PDF firmado.');
})().catch(cause => { console.error(cause); process.exitCode = 1; });
