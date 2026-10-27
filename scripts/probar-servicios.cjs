const assert = require('node:assert/strict');
const { setup, tokens, error, plain } = require('./simulador-api.cjs');
const pedido = { id: 12, codigoReserva: 'VS-BBBBBB', creadoEn: '2026-10-26T15:00:00Z', estado: 'NUEVO', items: [{ itemId: 21, nombre: 'Café', cantidad: 2, precioUnitario: 25, subtotal: 50 }], notas: 'Sin azúcar', total: 50, motivoCancelacion: null };
(async () => {
  {
    const menu = { categorias: [{ id: 1, nombre: 'Bebidas' }], items: [{ id: 21, categoriaId: 1, nombre: 'Café', descripcion: 'Café', precio: 25.1, fotoUrl: null, disponibilidad: 'DISPONIBLE' }, { id: 22, categoriaId: 1, nombre: 'Té', descripcion: 'Té', precio: 0.2, fotoUrl: null, disponibilidad: 'AGOTADO' }] };
    let intentos = 0;
    const { state, load: cargar } = setup(async path => {
      if (path === '/api/v1/app/reservas/VS-BBBBBB/menu') return [200, menu];
      if (path === '/api/v1/app/reservas/VS-BBBBBB/pedidos') return ++intentos === 1 ? [409, { codigo: 'ITEMS_AGOTADOS', mensaje: 'Algunos productos se agotaron.', detalles: [{ campo: 'items[0]', mensaje: 'Café está agotado.' }] }] : [201, pedido];
      return [404, error('NO_ENCONTRADO', 'No encontrado.')];
    });
    state.session = tokens;
    const pedidos = cargar('lib/api/pedidos');
    const api = cargar('lib/api/index');
    assert.equal(pedidos.totalCarrito(await pedidos.consultarMenu('VS-BBBBBB'), { 21: 3, 22: 0 }), 75.3, 'total sin errores de redondeo');
    await assert.rejects(pedidos.crearPedido('VS-BBBBBB', { 21: 2 }, ''), cause => cause instanceof api.ApiError && cause.status === 409 && cause.detalles[0].mensaje === 'Café está agotado.');
    assert.deepEqual(state.calls.at(-1).body, { items: [{ itemId: 21, cantidad: 2 }] }, 'sin precios ni notas vacías');
    await pedidos.crearPedido('VS-BBBBBB', { 21: 2, 22: 0 }, ' Sin azúcar ');
    assert.deepEqual(state.calls.at(-1).body, { items: [{ itemId: 21, cantidad: 2 }], notas: 'Sin azúcar' });
    const lista = [{ ...pedido, id: 11 }, pedido];
    assert.deepEqual(plain(pedidos.aplicarPedido(lista, { ...pedido, estado: 'EN_CAMINO' }).map(value => [value.id, value.estado])), [[11, 'NUEVO'], [12, 'EN_CAMINO']]);
    assert.deepEqual(plain(pedidos.aplicarPedido(lista, { ...pedido, id: 13 }).map(value => value.id)), [13, 11, 12]);
    console.log('OK: menú con total cotizado, pedido sin precios del cliente, 409 con ítems agotados y actualización en vivo de la lista.');
  }
  {
    let config;
    let subscribed;
    class Client { constructor(value) { Object.assign(this, value); config = this; } activate() { this.active = true; } deactivate() { this.active = false; return Promise.resolve(); } subscribe(destination, callback) { subscribed = { destination, callback }; } }
    const { state, load: cargar } = setup(async () => [404, error('NO_ENCONTRADO', '')], { '@stomp/stompjs': { Client }, 'fast-text-encoding': {} });
    state.session = tokens;
    const tiempoReal = cargar('lib/tiempo-real/index');
    assert.equal(tiempoReal.urlWebSocket('http://192.168.1.100:8080/'), 'ws://192.168.1.100:8080/ws');
    assert.equal(tiempoReal.urlWebSocket('https://api.villaserena.test'), 'wss://api.villaserena.test/ws');
    const recibidos = []; const conexion = []; let recargas = 0;
    const cerrar = tiempoReal.suscribirPedidos({ recargar: async () => { recargas++; }, alActualizar: value => recibidos.push(value), alCambiarConexion: value => conexion.push(value) });
    assert.equal(config.brokerURL, 'ws://api.test/ws');
    await config.beforeConnect();
    assert.deepEqual(plain(config.connectHeaders), { Authorization: 'Bearer jwt' });
    config.onConnect();
    assert.equal(subscribed.destination, '/user/queue/pedidos');
    assert.equal(recargas, 1, 'al conectar o reconectar se recarga por GET');
    subscribed.callback({ body: JSON.stringify({ tipo: 'PEDIDO_ACTUALIZADO', ocurridoEn: '2026-10-26T16:00:00Z', datos: { ...pedido, estado: 'ENTREGADO' } }) });
    subscribed.callback({ body: 'no es json' });
    subscribed.callback({ body: JSON.stringify({ tipo: 'OTRO', datos: pedido }) });
    assert.deepEqual(recibidos.map(value => value.estado), ['ENTREGADO']);
    config.onStompError();
    assert.equal(recargas, 2, 'un rechazo del servidor permite renovar el token por HTTP');
    config.onWebSocketClose();
    assert.deepEqual(conexion, [true, false, false]);
    cerrar();
    console.log('OK: STOMP con Bearer del huésped, cola privada, eventos PEDIDO_ACTUALIZADO y recarga al reconectar.');
  }

  {
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
  }
})().catch(cause => { console.error(cause); process.exitCode = 1; });
