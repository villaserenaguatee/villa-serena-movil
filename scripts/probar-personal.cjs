// Transporte y almacenamiento simulados: ninguna operación llega al hotel desplegado.
const assert = require('node:assert/strict');
const { setup, tokens, error, plain } = require('./simulador-api.cjs');
const profile = (rol, area = null, debeCambiarContrasena = false) => ({ id: 7, nombre: 'Personal de prueba', correo: 'personal@example.test', rol, area, debeCambiarContrasena });
const empleado = profile('MANTENIMIENTO_LIMPIEZA', 'AMBAS');
const session = { ...tokens, empleado };
function entorno(routes, extra = {}) { return setup(routes, { 'lib/sesion': undefined, 'expo-crypto': { randomUUID: () => 'b156bdd3-20da-4ad0-ad9a-2fe12383f479' }, ...extra }); }

(async () => {
  {
    const ctx = entorno(async (path, options) => {
      if (path === '/api/v1/auth/login') return [200, { ...tokens, empleado }];
      if (path === '/api/v1/auth/yo') return [200, empleado];
      if (path === '/api/v1/auth/cerrar-sesion') return [204];
      return [404, error('NO_ENCONTRADO', 'No encontrado')];
    });
    const api = ctx.load('lib/api/personal'), sesion = ctx.load('lib/sesion');
    await api.iniciarPersonal(' personal@example.test ', 'UnaClave123');
    assert.equal(ctx.state.calls[0].token, null);
    assert.equal((await sesion.readSession()).empleado.rol, 'MANTENIMIENTO_LIMPIEZA');
    assert.equal(api.puedeLimpieza(empleado), true); assert.equal(api.puedeMantenimiento(empleado), true);
    assert.equal(api.puedeMantenimiento(profile('MANTENIMIENTO_LIMPIEZA', 'LIMPIEZA')), false);
    assert.equal(api.puedeLimpieza(profile('MANTENIMIENTO_LIMPIEZA', 'MANTENIMIENTO')), false);
    assert.equal(api.esOperativo(profile('MANTENIMIENTO_LIMPIEZA')), false);
    assert.equal((await api.verificarPersonal()).id, 7);
    await api.cerrarPersonal(); assert.equal(await sesion.readSession(), null);
    assert.equal(ctx.state.calls.at(-1).path, '/api/v1/auth/cerrar-sesion');
    console.log('OK: identidad del servidor, áreas y SecureStore separados del huésped.');
  }
  for (const rol of ['ADMIN', 'RECEPCION']) {
    const ctx = entorno(async path => path.endsWith('/login') ? [200, { ...tokens, empleado: profile(rol) }] : [204]);
    await assert.rejects(ctx.load('lib/api/personal').iniciarPersonal('personal@example.test', 'UnaClave123'), /Usa la web/);
    assert.equal(await ctx.load('lib/sesion').readSession(), null);
    assert.equal(ctx.state.calls.at(-1).token, 'Bearer jwt', 'reclama revocación sin conservar el token rechazado');
  }
  {
    const ctx = entorno(async (path) => {
      if (path.endsWith('/yo')) return [200, profile('ROOM_SERVICE', null, true)];
      if (path.endsWith('/cambiar-contrasena')) return [200, { ...tokens, empleado: profile('ROOM_SERVICE') }];
      return [200, []];
    });
    const sesion = ctx.load('lib/sesion'), api = ctx.load('lib/api/personal');
    await sesion.saveSession({ ...tokens, empleado: profile('ROOM_SERVICE', null, true) });
    await assert.rejects(api.colaPedidos(), /temporal/);
    assert.equal(ctx.state.calls.some(c => c.path.includes('/room-service/')), false);
    await api.cambiarContrasenaPersonal({ contrasenaActual: 'Temporal123', contrasenaNueva: 'Distinta123', confirmacion: 'Distinta123' });
    assert.equal((await sesion.readSession()).empleado.debeCambiarContrasena, false);
    console.log('OK: contraseña temporal bloquea operaciones y el cambio guarda la nueva identidad.');
  }
  for (const [e, method] of [[profile('ROOM_SERVICE'), 'habitacionesLimpieza'], [profile('MANTENIMIENTO_LIMPIEZA', 'LIMPIEZA'), 'incidenciasPersonal'], [profile('MANTENIMIENTO_LIMPIEZA', 'MANTENIMIENTO'), 'solicitudesPersonal']]) {
    const ctx = entorno(async () => [200, e]); await ctx.load('lib/sesion').saveSession({ ...tokens, empleado: e });
    await assert.rejects(ctx.load('lib/api/personal')[method](), /rol o área/);
    assert.equal(ctx.state.calls.length, 1, 'solo se verifica identidad; no se consulta el módulo ajeno');
  }
  {
    let refresh = 0;
    const ctx = entorno(async path => {
      if (path.endsWith('/yo') && !refresh) return [401, error('SESION_VENCIDA', 'Expirada')];
      if (path.endsWith('/renovar')) { refresh++; return [200, { ...tokens, accessToken: 'nuevo', refreshToken: 'rotado' }]; }
      return [200, empleado];
    });
    await ctx.load('lib/sesion').saveSession(session);
    await ctx.load('lib/api/personal').verificarPersonal();
    const s = await ctx.load('lib/sesion').readSession();
    assert.equal(s.empleado.area, 'AMBAS'); assert.equal(s.accessToken, 'nuevo'); assert.equal(refresh, 1);
    console.log('OK: renovar conserva personal/área y verifica identidad actualizada.');
  }
  {
    const ctx = entorno(async () => { throw new TypeError('sin red'); });
    await ctx.load('lib/sesion').saveSession(session);
    await assert.rejects(ctx.load('lib/api/personal').cerrarPersonal());
    assert.equal(await ctx.load('lib/sesion').readSession(), null);
  }
  {
    let actual = profile('ROOM_SERVICE');
    const ctx = entorno(async path => path.endsWith('/yo') ? [200, actual] : [200, { id: 12 }]);
    await ctx.load('lib/sesion').saveSession({ ...tokens, empleado: actual });
    const api = ctx.load('lib/api/personal');
    await api.avanzarPedido(12, 'NUEVO');
    assert.deepEqual(plain(ctx.state.calls.at(-1).body), { estadoEsperado: 'NUEVO', nuevoEstado: 'EN_PREPARACION' });
    assert.equal(api.siguientePedido('ENTREGADO'), null);
    assert.throws(() => api.avanzarPedido(12, 'CANCELADO'));
    await api.cancelarPedidoPersonal(12, ' Motivo válido ');
    assert.deepEqual(plain(ctx.state.calls.at(-1).body), { motivo: 'Motivo válido' });
    assert.throws(() => api.cancelarPedidoPersonal(12, ' '));
    actual = empleado;
    await api.cambiarLimpieza(4, 'iniciar'); assert.equal(ctx.state.calls.at(-1).path, '/api/v1/limpieza/habitaciones/4/iniciar');
    await api.cambiarSolicitud(8, 'atender'); assert.equal(ctx.state.calls.at(-1).path, '/api/v1/limpieza/solicitudes/8/atender');
    await api.resolverIncidencia(3, ' Reparación realizada ');
    assert.deepEqual(plain(ctx.state.calls.at(-1).body), { solucion: 'Reparación realizada' });
    assert.throws(() => api.resolverIncidencia(3, ''));
    console.log('OK: transiciones con estado esperado, motivos, responsable en servidor y rutas existentes.');
  }
  {
    let fallar = true;
    const ctx = entorno(async path => {
      if (path.endsWith('/yo')) return [200, empleado];
      if (path === '/api/v1/incidencias' && fallar) throw new TypeError('Respuesta perdida');
      return [201, { id: 77, estado: 'REPORTADA' }];
    });
    await ctx.load('lib/sesion').saveSession(session);
    const reporter = ctx.load('lib/personal/reporte');
    const body = { habitacionId: 4, descripcion: 'Fuga en ducha', impideUso: true };
    await assert.rejects(reporter.enviarReporte(body));
    assert.equal((await reporter.leerReportePendiente(7)).body.descripcion, body.descripcion);
    await assert.rejects(reporter.enviarReporte({ ...body, descripcion: 'Otro reporte' }), /pendiente/);
    const count = ctx.state.calls.filter(c => c.path === '/api/v1/incidencias').length;
    assert.equal(count, 1);
    // Restituir sesión simula reiniciar/cerrar y volver a entrar con el mismo empleado.
    await ctx.load('lib/sesion').clearSession(); await ctx.load('lib/sesion').saveSession(session);
    fallar = false; await reporter.enviarReporte(body);
    const calls = ctx.state.calls.filter(c => c.path === '/api/v1/incidencias');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].headers.get('Idempotency-Key'), calls[1].headers.get('Idempotency-Key'));
    assert.equal(await reporter.leerReportePendiente(7), null);
    console.log('OK: reporte incierto persiste datos/referencia y reintenta sin crear otro incidente.');
  }
  {
    const clients = [];
    class Client { constructor(config) { this.config = config; this.subscriptions = []; clients.push(this); } activate() {} deactivate() { this.stopped = true; return Promise.resolve(); } subscribe(dest) { this.subscriptions.push(dest); } }
    let tickets = 0;
    const ctx = entorno(async path => path.endsWith('/yo') ? [200, profile('ROOM_SERVICE')] : [200, { ticket: 'ticket-' + ++tickets, expiraEn: '2026-11-01T00:00:00Z' }], { '@stomp/stompjs': { Client }, 'fast-text-encoding': {} });
    await ctx.load('lib/sesion').saveSession({ ...tokens, empleado: profile('ROOM_SERVICE') });
    const ws = ctx.load('lib/tiempo-real');
    assert.deepEqual(plain(ws.destinosPersonal(empleado)), ['/topic/habitaciones', '/topic/solicitudes']);
    assert.deepEqual(plain(ws.destinosPersonal(profile('MANTENIMIENTO_LIMPIEZA', 'MANTENIMIENTO'))), []);
    assert.deepEqual(plain(ws.destinosPersonal(profile('ROOM_SERVICE', null, true))), []);
    const stop = ws.suscribirPersonal(profile('ROOM_SERVICE'), async () => {}, () => {});
    await clients[0].config.beforeConnect(); assert.deepEqual(plain(clients[0].connectHeaders), { ticket: 'ticket-1' });
    await clients[0].config.beforeConnect(); assert.equal(clients[0].connectHeaders.ticket, 'ticket-2');
    clients[0].config.onConnect(); assert.deepEqual(clients[0].subscriptions, ['/topic/pedidos']);
    stop(); assert.equal(clients[0].stopped, true);
    console.log('OK: STOMP del personal usa ticket nuevo por conexión y destinos autorizados.');
  }
  {
    class NativeFormData { fields = []; append(name, value) { this.fields.push([name, value]); } }
    const ctx = entorno(async path => path.endsWith('/yo') ? [200, empleado] : [200, { clave: 'incidencias/prueba.jpg' }], { FormData: NativeFormData });
    await ctx.load('lib/sesion').saveSession(session);
    const api = ctx.load('lib/api/personal');
    assert.equal(await api.subirFotoIncidencia({ uri: 'file:///foto.jpg', mimeType: 'image/jpeg', fileSize: 1024 }), 'incidencias/prueba.jpg');
    const call = ctx.state.calls.at(-1);
    assert.equal(call.path, '/api/v1/archivos/imagenes'); assert.equal(call.token, 'Bearer jwt');
    assert.equal(call.body.fields[0][1], 'INCIDENCIA');
    assert.equal(call.headers.has('Content-Type'), false, 'React Native fija el boundary multipart');
    await assert.rejects(api.subirFotoIncidencia({ uri: 'file:///foto.svg', mimeType: 'image/svg+xml' }), /JPG o PNG/);
    await assert.rejects(api.subirFotoIncidencia({ uri: 'file:///foto.jpg', mimeType: 'image/jpeg', fileSize: 5 * 1024 * 1024 + 1 }), /5 MiB/);
    assert.equal(ctx.state.calls.filter(c => c.path.endsWith('/archivos/imagenes')).length, 1);
    console.log('OK: foto privada INCIDENCIA, límites y multipart autenticado sin boundary manual.');
  }
})().catch(cause => { console.error(cause); process.exitCode = 1; });
