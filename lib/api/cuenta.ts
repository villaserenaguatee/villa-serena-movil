import { rutaReserva } from './huesped';
import { apiJson, type Schemas } from './index';

// HU-HUE-15: cuenta de la reserva; solo lectura y sin tiempo real.
export type CuentaHuesped = Schemas['CuentaHuesped'];
export type EstadoPago = Schemas['EstadoPago'];
export type MetodoPago = Schemas['MetodoPago'];

export const estadoPagoLabel: Record<EstadoPago, string> = { APROBADO: 'Aprobado', PENDIENTE: 'Pendiente', FALLIDO: 'Fallido', REEMBOLSADO: 'Reembolsado' };
export const metodoPagoLabel: Record<MetodoPago, string> = { RECURRENTE: 'Pago en línea', STRIPE: 'Pago en línea (Stripe)', CANAL: 'Canal de reserva', EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', OTRO: 'Otro' };

export function consultarCuenta(codigo: string) { return apiJson<CuentaHuesped>(rutaReserva(codigo, '/cuenta')); }

