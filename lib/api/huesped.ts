import { clearSession, readSession, saveSession, tokensSchema } from '../sesion';
import { apiJson, type Schemas } from './index';

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

// Revoca el refresh en el servidor; los tokens locales se borran aunque falle la red.
export async function cerrarSesion() {
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

export function detalleReserva(codigo: string) { return apiJson<ReservaDetalle>(`/api/v1/app/reservas/${encodeURIComponent(codigo)}`); }

// Con una reserva EN_ESTADIA se entra directo a su detalle; si no, al selector.
export function destinoTrasAcceso(reservas: ReservaResumen[]) {
  const activa = reservas.find(reserva => reserva.estado === 'EN_ESTADIA');
  return activa ? { pathname: '/estadia' as const, params: { codigo: activa.codigo } } : '/reservas' as const;
}
