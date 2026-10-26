import { rutaReserva } from './huesped';
import { apiJson, type Schemas } from './index';

// HU-HUE-12, HU-HUE-13 y HU-HUE-14: limpieza, artículos y seguimiento sin tiempo real.
export type Articulo = Schemas['ArticuloSolicitable'];
export type Solicitud = Schemas['SolicitudHuesped'];
export type EstadoSolicitud = Schemas['EstadoSolicitud'];

export const estadoSolicitudLabel: Record<EstadoSolicitud, string> = { PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', ATENDIDA: 'Atendida', CANCELADA: 'Cancelada' };

export function listarArticulos(codigo: string) { return apiJson<Articulo[]>(rutaReserva(codigo, '/articulos')); }

export function listarSolicitudes(codigo: string) { return apiJson<Solicitud[]>(rutaReserva(codigo, '/solicitudes')); }

export function solicitarLimpieza(codigo: string, comentario: string) {
  const body: Schemas['SolicitarLimpiezaPeticion'] = comentario.trim() ? { comentario: comentario.trim() } : {};
  return apiJson<Solicitud>(rutaReserva(codigo, '/solicitudes/limpieza'), { method: 'POST', body });
}

// Solo artículos con cantidad positiva; el servidor vuelve a validar los máximos.
export function solicitarArticulos(codigo: string, cantidades: Record<number, number>) {
  const body: Schemas['SolicitarArticulosPeticion'] = { articulos: Object.entries(cantidades).filter(([, cantidad]) => cantidad > 0).map(([articuloId, cantidad]) => ({ articuloId: Number(articuloId), cantidad })) };
  return apiJson<Solicitud>(rutaReserva(codigo, '/solicitudes/articulos'), { method: 'POST', body });
}

export function cancelarSolicitud(codigo: string, id: number) { return apiJson<Solicitud>(rutaReserva(codigo, `/solicitudes/${id}/cancelar`), { method: 'POST' }); }

export function describirSolicitud(solicitud: Solicitud) {
  return solicitud.tipo === 'LIMPIEZA' ? 'Limpieza de habitación' : solicitud.articulos.map(articulo => `${articulo.nombre} × ${articulo.cantidad}`).join(', ');
}
