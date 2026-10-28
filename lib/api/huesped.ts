import { clearSession, onSessionCleared, readSession, saveSession, tokensSchema } from '../sesion';
import { ApiError, apiJson, type Schemas } from './index';
import { darDeBajaDispositivo } from './push';

// HU-HUE-08 y HU-HUE-09: acceso con código por correo y reservas del huésped.
export type ReservaResumen = Schemas['ReservaAppResumen'];
export type ReservaDetalle = Schemas['ReservaAppDetalle'];
export type EstadoReserva = Schemas['EstadoReserva'];

export const estadoReservaLabel: Record<EstadoReserva, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago', CONFIRMADA: 'Confirmada', EN_ESTADIA: 'En estadía', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada',
};

export async function solicitarCodigo(correo: string) {
  const body: Schemas['CodigoAccesoPeticion'] = { correo };
  return (await apiJson<Schemas['MensajeGenerico']>('/api/v1/app/acceso/solicitar-codigo', { method: 'POST', body }, false)).mensaje;
}

export async function verificarCodigo(correo: string, codigo: string) {
  const body: Schemas['VerificarCodigoPeticion'] = { correo, codigo };
  await saveSession(tokensSchema.parse(await apiJson<Schemas['Tokens']>('/api/v1/app/acceso/verificar-codigo', { method: 'POST', body }, false)));
}

// Da de baja el push y revoca el refresh en el servidor; los tokens locales se borran aunque falle la red.
export async function cerrarSesion() {
  await darDeBajaDispositivo().catch(() => undefined);
  try {
    const session = await readSession();
    if (session) {
      const body: Schemas['RefreshPeticion'] = { refreshToken: session.refreshToken };
      await apiJson<void>('/api/v1/app/cerrar-sesion', { method: 'POST', body });
    }
  } catch { /* El cierre local no depende de la respuesta del servidor. */ }
  finally { await clearSession(); }
}

export function listarReservas() { return apiJson<ReservaResumen[]>('/api/v1/app/reservas'); }

export function detalleReserva(codigo: string) { return apiJson<ReservaDetalle>(rutaReserva(codigo)); }

export function rutaReserva(codigo: string, subruta = '') { return `/api/v1/app/reservas/${encodeURIComponent(codigo)}${subruta}`; }

// Reserva abierta por última vez; permite llegar a cuenta, pedidos o solicitudes desde una notificación.
let reservaRecordada: string | null = null;
onSessionCleared(() => { reservaRecordada = null; });
export async function reservaActual(codigo?: string) {
  if (codigo) return reservaRecordada = codigo;
  if (reservaRecordada) return reservaRecordada;
  const activa = (await listarReservas()).find(reserva => reserva.estado === 'EN_ESTADIA');
  if (!activa) throw new ApiError(404, 'SIN_ESTADIA', 'No tienes una estadía activa. Elige una reserva en «Mis reservas».');
  return reservaRecordada = activa.codigo;
}

// Con una reserva EN_ESTADIA se entra directo a su detalle; si no, al selector.
export function destinoTrasAcceso(reservas: ReservaResumen[]) {
  const activa = reservas.find(reserva => reserva.estado === 'EN_ESTADIA');
  return activa ? { pathname: '/estadia' as const, params: { codigo: activa.codigo } } : '/reservas' as const;
}

export type PerfilHuesped = {
  id: number;
  nombreCompleto: string;
  correo: string;
  telefono: string | null;
  nacionalidad: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  paisEmisorPasaporte: string | null;
};

export type MensajeChat = {
  id: number;
  autor: 'HUESPED' | 'RECEPCION';
  texto: string;
  creadoEn: string;
};

export type DocumentoCheckin = {
  id: number;
  nombre: string;
  mime: string;
  bytes: number;
  estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
  motivo: string | null;
  creadoEn: string;
};

export type WifiHuesped = Schemas['Wifi'];
export type AmenidadHuesped = Schemas['AmenidadApp'];

export function consultarPerfil() { return apiJson<PerfilHuesped>('/api/v1/app/perfil'); }
export function consultarWifi() { return apiJson<WifiHuesped>('/api/v1/app/wifi'); }
export function listarAmenidades() { return apiJson<AmenidadHuesped[]>('/api/v1/app/amenidades'); }
export function listarMensajesChat(codigo: string) { return apiJson<MensajeChat[]>(rutaReserva(codigo, '/chat')); }
export function listarDocumentosCheckin(codigo: string) { return apiJson<DocumentoCheckin[]>(rutaReserva(codigo, '/documentos')); }

function uuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const rand = Math.floor(Math.random() * 16);
    return (char === 'x' ? rand : (rand & 0x3) | 0x8).toString(16);
  });
}

export function enviarMensajeChat(codigo: string, texto: string) {
  return apiJson<{ id: number }>(rutaReserva(codigo, '/chat'), { method: 'POST', body: { clave: uuidV4(), texto: texto.trim() } });
}
