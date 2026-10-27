// Prueba lib/api/huesped.ts con servidor y SecureStore simulados, sin credenciales.
const assert = require('node:assert/strict');
const { setup, tokens, error, plain } = require('./simulador-api.cjs');
const generic = { mensaje: 'Si el correo tiene reservas, recibirás un código para entrar.' };
const reservas = [{ codigo: 'VS-AAAAAA', entrada: '2026-11-01', salida: '2026-11-03', estado: 'CONFIRMADA' }, { codigo: 'VS-BBBBBB', entrada: '2026-10-25', salida: '2026-10-27', estado: 'EN_ESTADIA' }];
(async () => {
  {
    const { state, load } = setup(async path => {
      if (path === '/api/v1/app/acceso/solicitar-codigo') return [200, generic];
      if (path === '/api/v1/app/acceso/verificar-codigo') return [200, tokens];
      if (path === '/api/v1/app/reservas') return [200, reservas];
      if (path === '/api/v1/app/cerrar-sesion') return [204];
      return [404, error('NO_ENCONTRADO', 'No encontrado.')];
    });
    const huesped = load('lib/api/huesped');
    assert.equal(await huesped.solicitarCodigo('ana@example.com'), generic.mensaje);
    assert.equal(state.calls[0].token, null);
    await huesped.verificarCodigo('ana@example.com', '123456');
    assert.deepEqual(state.calls[1].body, { correo: 'ana@example.com', codigo: '123456' });
    assert.equal(state.session.accessToken, 'jwt');
    const lista = await huesped.listarReservas();
    assert.equal(state.calls[2].token, 'Bearer jwt');
    assert.deepEqual(plain(huesped.destinoTrasAcceso(lista)), { pathname: '/estadia', params: { codigo: 'VS-BBBBBB' } });
    assert.equal(huesped.destinoTrasAcceso(lista.slice(0, 1)), '/reservas');
    assert.equal(huesped.destinoTrasAcceso([]), '/reservas');
    assert.equal(await huesped.reservaActual(), 'VS-BBBBBB', 'sin código se usa la reserva EN_ESTADIA');
    assert.equal(await huesped.reservaActual('VS-AAAAAA'), 'VS-AAAAAA');
    const consultas = state.calls.length;
    assert.equal(await huesped.reservaActual(), 'VS-AAAAAA', 'recuerda la última reserva abierta');
    assert.equal(state.calls.length, consultas);
    await huesped.cerrarSesion();
    assert.deepEqual(state.calls.at(-1).body, { refreshToken: 'refresh' });
    assert.equal(state.session, null);
    assert.equal(await huesped.reservaActual(), 'VS-BBBBBB', 'cerrar sesión olvida la reserva recordada');
    assert.equal(state.calls.at(-1).path, '/api/v1/app/reservas');
    console.log('OK: código, tokens guardados, reservas con Bearer, destino tras acceso, reserva actual y cierre de sesión.');
  }
  {
    const { state, load } = setup(async () => [401, error('ACCESO_BLOQUEADO', 'El acceso está bloqueado por 15 minutos. Intenta más tarde.')]);
    const api = load('lib/api/index');
    await assert.rejects(load('lib/api/huesped').verificarCodigo('ana@example.com', '000000'), cause => cause instanceof api.ApiError && cause.codigo === 'ACCESO_BLOQUEADO' && /15 minutos/.test(cause.message));
    assert.equal(state.session, null);
    assert.equal(state.calls.length, 1, 'un 401 del acceso no intenta renovar');
    console.log('OK: errores del contrato llegan con su código y mensaje, sin renovar ni guardar tokens.');
  }
  {
    const { state, load } = setup(async () => { throw new TypeError('Network request failed'); });
    const huesped = load('lib/api/huesped');
    state.session = tokens;
    await huesped.cerrarSesion();
    assert.equal(state.session, null);
    await assert.rejects(huesped.solicitarCodigo('ana@example.com'), /No pudimos conectar/);
    console.log('OK: sin red el cierre de sesión borra los tokens y el acceso informa la falta de conexión.');
  }
  {
    const { state, load } = setup(async () => [401, error('SESION_VENCIDA', 'Tu sesión venció.')]);
    state.session = tokens;
    await assert.rejects(load('lib/api/huesped').listarReservas(), /sesión venció/);
    assert.equal(state.session, null);
    console.log('OK: refresh rechazado cierra la sesión local.');
  }
  {
    const { state, load } = setup(async path => {
      if (path === '/api/v1/app/reservas/VS-BBBBBB/cuenta') return [200, { codigoReserva: 'VS-BBBBBB', saldo: 125 }];
      return [404, error('NO_ENCONTRADO', 'La reserva no existe.')];
    });
    state.session = tokens;
    const cuenta = load('lib/api/cuenta');
    assert.equal((await cuenta.consultarCuenta('VS-BBBBBB')).saldo, 125);
    assert.equal(state.calls[0].token, 'Bearer jwt');
    await assert.rejects(cuenta.consultarCuenta('VS-ZZZZZZ'), /no existe/, 'una reserva ajena muestra el 404 del servidor');
    console.log('OK: la cuenta se consulta con el token del huésped y una reserva ajena no se muestra.');
  }
})().catch(cause => { console.error(cause); process.exitCode = 1; });
