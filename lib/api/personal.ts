import { ApiError, apiJson, apiRequest, type Schemas } from './index';
import { clearSession, empleadoSchema, readSession, saveSession, tokensSchema, type Empleado } from '../sesion';

export function esOperativo(empleado: Empleado) {
  return empleado.rol === 'ROOM_SERVICE' || (empleado.rol === 'MANTENIMIENTO_LIMPIEZA' && empleado.area !== null);
}
export function puedeLimpieza(empleado: Empleado) {
  return empleado.rol === 'MANTENIMIENTO_LIMPIEZA' && (empleado.area === 'LIMPIEZA' || empleado.area === 'AMBAS');
}
export function puedeMantenimiento(empleado: Empleado) {
  return empleado.rol === 'MANTENIMIENTO_LIMPIEZA' && (empleado.area === 'MANTENIMIENTO' || empleado.area === 'AMBAS');
}
function validarEmpleado(value: unknown) {
  const empleado = empleadoSchema.parse(value);
  if (!esOperativo(empleado)) throw new ApiError(403, 'ROL_NO_DISPONIBLE', 'Esta app admite personal de Room Service, Limpieza y Mantenimiento. Usa la web para tu rol.');
  return empleado;
}
async function guardarPersonal(value: Schemas['SesionEmpleado']) {
  try {
    const empleado = validarEmpleado(value.empleado);
    await saveSession({ ...tokensSchema.parse(value), empleado });
    return empleado;
  } catch (error) { await clearSession(); throw error; }
}
export async function iniciarPersonal(correo: string, contrasena: string) {
  const result = await apiJson<Schemas['SesionEmpleado']>('/api/v1/auth/login', { method: 'POST', body: { correo: correo.trim(), contrasena } }, false);
  // No conservar ni siquiera los tokens de un rol fuera de esta entrega.
  if (!esOperativo(empleadoSchema.parse(result.empleado))) {
    await apiJson('/api/v1/auth/cerrar-sesion', { method: 'POST', body: { refreshToken: result.refreshToken }, headers: { Authorization: `Bearer ${result.accessToken}` } }, false).catch(() => undefined);
  }
  return guardarPersonal(result);
}
export async function verificarPersonal() {
  const session = await readSession();
  if (!session?.empleado) throw new ApiError(403, 'ACCESO_DENEGADO', 'Inicia sesión como personal.');
  try {
    const empleado = validarEmpleado(await apiJson<Empleado>('/api/v1/auth/yo'));
    const actual = await readSession();
    if (!actual?.empleado) throw new ApiError(401, 'SESION_VENCIDA', 'Inicia sesión de nuevo.');
    await saveSession({ ...actual, empleado });
    return empleado;
  } catch (error) { await clearSession(); throw error; }
}
export async function cambiarContrasenaPersonal(body: Schemas['CambiarContrasenaPeticion']) {
  return guardarPersonal(await apiJson<Schemas['SesionEmpleado']>('/api/v1/auth/cambiar-contrasena', { method: 'POST', body }));
}
export async function cerrarPersonal() {
  try {
    const session = await readSession();
    if (session) await apiJson('/api/v1/auth/cerrar-sesion', { method: 'POST', body: { refreshToken: session.refreshToken } });
  } finally { await clearSession(); }
}
// El API sigue siendo la autoridad: verificar identidad/área antes de cada operación.
async function permitir(modulo: 'room-service' | 'limpieza' | 'mantenimiento' | 'reporte') {
  const e = await verificarPersonal();
  if (e.debeCambiarContrasena) throw new ApiError(403, 'CONTRASENA_TEMPORAL', 'Cambia tu contraseña temporal antes de continuar.');
  const permitido = modulo === 'room-service' ? e.rol === 'ROOM_SERVICE' : modulo === 'limpieza' ? puedeLimpieza(e)
    : modulo === 'mantenimiento' ? puedeMantenimiento(e) : e.rol === 'MANTENIMIENTO_LIMPIEZA';
  if (!permitido) throw new ApiError(403, 'ACCESO_DENEGADO', 'Tu rol o área no permite esta operación.');
  return e;
}
async function operacion<T>(modulo: Parameters<typeof permitir>[0], path: string, body?: unknown, headers?: Record<string, string>) {
  await permitir(modulo);
  return apiJson<T>(path, { ...(body !== undefined ? { method: 'POST', body } : {}), headers });
}
const idValido = (id: number) => { if (!Number.isSafeInteger(id) || id < 1) throw new Error('Identificador inválido.'); return id; };
export const colaPedidos = () => operacion<Schemas['PedidoRoomService'][]>('room-service', '/api/v1/room-service/pedidos');
export const pedidoPersonal = (id: number) => operacion<Schemas['PedidoRoomService']>('room-service', `/api/v1/room-service/pedidos/${idValido(id)}`);
export const menuPersonal = () => operacion<Schemas['MenuApp']>('room-service', '/api/v1/room-service/menu');
export function siguientePedido(estado: Schemas['EstadoPedido']): Schemas['EstadoPedido'] | null {
  return estado === 'NUEVO' ? 'EN_PREPARACION' : estado === 'EN_PREPARACION' ? 'EN_CAMINO' : estado === 'EN_CAMINO' ? 'ENTREGADO' : null;
}
export function avanzarPedido(id: number, estado: Schemas['EstadoPedido']) {
  const siguiente = siguientePedido(estado);
  if (!siguiente) throw new Error('El pedido ya finalizó. Actualiza su estado.');
  return operacion<Schemas['PedidoRoomService']>('room-service', `/api/v1/room-service/pedidos/${idValido(id)}/avanzar`, { estadoEsperado: estado, nuevoEstado: siguiente });
}
export function cancelarPedidoPersonal(id: number, motivo: string) {
  if (!motivo.trim() || motivo.trim().length > 500) throw new Error('Indica un motivo de hasta 500 caracteres.');
  return operacion<Schemas['PedidoRoomService']>('room-service', `/api/v1/room-service/pedidos/${idValido(id)}/cancelar`, { motivo: motivo.trim() });
}
export const agotarItem = (id: number) => operacion<Schemas['ItemMenuApp']>('room-service', `/api/v1/room-service/menu/items/${idValido(id)}/agotar`, {});
export const habitacionesLimpieza = () => operacion<Schemas['HabitacionLimpieza'][]>('limpieza', '/api/v1/limpieza/habitaciones');
export const solicitudesPersonal = () => operacion<Schemas['SolicitudLimpieza'][]>('limpieza', '/api/v1/limpieza/solicitudes');
export const detalleSolicitudPersonal = (id: number) => operacion<Schemas['SolicitudLimpieza']>('limpieza', `/api/v1/limpieza/solicitudes/${idValido(id)}`);
export const cambiarLimpieza = (id: number, accion: 'iniciar' | 'interrumpir' | 'terminar') => operacion<Schemas['ResultadoCondicionHabitacion']>('limpieza', `/api/v1/limpieza/habitaciones/${idValido(id)}/${accion}`, {});
export const cambiarSolicitud = (id: number, accion: 'tomar' | 'atender') => operacion<Schemas['SolicitudLimpieza']>('limpieza', `/api/v1/limpieza/solicitudes/${idValido(id)}/${accion}`, {});
export const incidenciasPersonal = () => operacion<Schemas['IncidenciaResumen'][]>('mantenimiento', '/api/v1/incidencias');
export const incidenciaPersonal = (id: number) => operacion<Schemas['IncidenciaDetalle']>('mantenimiento', `/api/v1/incidencias/${idValido(id)}`);
export const tomarIncidencia = (id: number) => operacion<Schemas['IncidenciaDetalle']>('mantenimiento', `/api/v1/incidencias/${idValido(id)}/tomar`, {});
export function resolverIncidencia(id: number, solucion: string) {
  if (!solucion.trim() || solucion.trim().length > 2000) throw new Error('Describe una solución de hasta 2000 caracteres.');
  return operacion<Schemas['IncidenciaDetalle']>('mantenimiento', `/api/v1/incidencias/${idValido(id)}/resolver`, { solucion: solucion.trim() });
}
export const habitacionesIncidencias = () => operacion<Schemas['HabitacionOperativa'][]>('reporte', '/api/v1/incidencias/habitaciones');
export function reportarIncidencia(body: Schemas['ReportarIncidenciaPeticion'], clave: string) {
  if (!body.descripcion.trim() || body.descripcion.trim().length > 2000 || !Number.isSafeInteger(body.habitacionId) || body.habitacionId < 1) throw new Error('Selecciona habitación y describe el daño (hasta 2000 caracteres).');
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(clave)) throw new Error('La referencia del intento es inválida.');
  return operacion<Schemas['IncidenciaCreada']>('reporte', '/api/v1/incidencias', { ...body, descripcion: body.descripcion.trim() }, { 'Idempotency-Key': clave });
}
export async function ticketPersonal() {
  await verificarPersonal();
  return apiJson<Schemas['WsTicket']>('/api/v1/auth/ws-ticket', { method: 'POST' });
}
export async function subirFotoIncidencia(foto: { uri: string; mimeType?: string | null; fileSize?: number }) {
  await permitir('reporte');
  if (!foto.uri || !['image/jpeg', 'image/png'].includes(foto.mimeType ?? '') || (foto.fileSize ?? 0) > 5 * 1024 * 1024) throw new Error('La foto debe ser JPG o PNG y no superar 5 MiB.');
  const body = new FormData();
  body.append('uso', 'INCIDENCIA');
  body.append('archivo', { uri: foto.uri, type: foto.mimeType, name: foto.mimeType === 'image/png' ? 'incidencia.png' : 'incidencia.jpg' } as unknown as Blob);
  let response: Response;
  try { response = await apiRequest('/api/v1/archivos/imagenes', { method: 'POST', body }); }
  catch { throw new ApiError(0, 'SIN_CONEXION', 'No se confirmó la subida de la foto.'); }
  if (!response.ok) {
    const error = await response.json().catch(() => null) as Partial<Schemas['Error']> | null;
    throw new ApiError(response.status, error?.codigo ?? 'FOTO_RECHAZADA', error?.mensaje ?? 'No se pudo subir la foto.');
  }
  return (await response.json() as Schemas['ImagenSubida']).clave;
}
