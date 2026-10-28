import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { rutaReserva } from './huesped';
import { apiJson, type Schemas } from './index';

// HU-HUE-16: pago del saldo con Recurrente, check-out digital y factura.
export type VistaCheckout = Schemas['VistaCheckout'];
export type ProcesoPago = Schemas['ProcesoPago'];
export type Factura = Schemas['FacturaDetalle'];

export function consultarCheckout(codigo: string) { return apiJson<VistaCheckout>(rutaReserva(codigo, '/checkout')); }

export function consultarPagoSaldo(codigo: string) { return apiJson<ProcesoPago>(rutaReserva(codigo, '/pago-saldo/estado')); }

// 204 significa saldo cero: no hay sesión de pago y se puede confirmar el check-out.
export function iniciarPagoSaldo(codigo: string) { return apiJson<Schemas['PagoIniciado'] | undefined>(rutaReserva(codigo, '/pago-saldo'), { method: 'POST' }); }

export function confirmarCheckout(codigo: string, comprador: Schemas['CompradorFactura'], aceptaCancelarPedidos: boolean) {
  const body: Schemas['CheckoutAppPeticion'] = { comprador, aceptaCancelarPedidos };
  return apiJson<Schemas['CheckoutResultado']>(rutaReserva(codigo, '/checkout'), { method: 'POST', body });
}

export function consultarFactura(codigo: string) { return apiJson<Factura>(rutaReserva(codigo, '/factura')); }

// URL firmada y temporal; se pide de nuevo cada vez que se abre el PDF.
export function enlaceFacturaPdf(id: number) { return apiJson<Schemas['DescargaFactura']>(`/api/v1/facturas/${id}/pdf`); }

// La pasarela vuelve a villaserena://checkout; si openAuthSessionAsync no está disponible en el entorno, usa openBrowserAsync.
export async function abrirPasarela(urlPago: string) {
  try {
    await WebBrowser.openAuthSessionAsync(urlPago, Linking.createURL('checkout'));
  } catch {
    if (typeof WebBrowser.openBrowserAsync === 'function') {
      await WebBrowser.openBrowserAsync(urlPago);
    } else {
      await Linking.openURL(urlPago);
    }
  }
}

// El webhook o la conciliación del servidor acreditan el pago; se consulta mientras la acción sea ESPERAR.
export async function esperarAcreditacion(codigo: string, intentos = 10, esperaMs = 3000) {
  let proceso = await consultarPagoSaldo(codigo);
  for (let i = 1; i < intentos && proceso.accionPago === 'ESPERAR'; i++) {
    await new Promise(resolve => setTimeout(resolve, esperaMs));
    proceso = await consultarPagoSaldo(codigo);
  }
  return proceso;
}
