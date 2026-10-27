import { rutaReserva } from './huesped';
import { apiJson, type Schemas } from './index';

// HU-HUE-10 y HU-HUE-11: menú, pedidos con cargo al entregar y seguimiento.
export type Menu = Schemas['MenuApp'];
export type Pedido = Schemas['PedidoHuesped'];
export type EstadoPedido = Schemas['EstadoPedido'];

export const estadoPedidoLabel: Record<EstadoPedido, string> = { NUEVO: 'Nuevo', EN_PREPARACION: 'En preparación', EN_CAMINO: 'En camino', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado' };

export function consultarMenu(codigo: string) { return apiJson<Menu>(rutaReserva(codigo, '/menu')); }

export function listarPedidos(codigo: string) { return apiJson<Pedido[]>(rutaReserva(codigo, '/pedidos')); }

// Precios y total los calcula el servidor; el cliente envía solo ítems y cantidades.
export function crearPedido(codigo: string, carrito: Record<number, number>, notas: string) {
  const body: Schemas['CrearPedidoPeticion'] = { items: Object.entries(carrito).filter(([, cantidad]) => cantidad > 0).map(([itemId, cantidad]) => ({ itemId: Number(itemId), cantidad })) };
  if (notas.trim()) body.notas = notas.trim();
  return apiJson<Pedido>(rutaReserva(codigo, '/pedidos'), { method: 'POST', body });
}

// Total cotizado en pantalla, en centavos para evitar errores de redondeo.
export function totalCarrito(menu: Menu, carrito: Record<number, number>) {
  return menu.items.reduce((total, item) => total + Math.round(item.precio * 100) * (carrito[item.id] ?? 0), 0) / 100;
}

// Reemplaza en su lugar un pedido recibido en vivo; si es nuevo para la lista, lo agrega al inicio.
export function aplicarPedido(pedidos: Pedido[], pedido: Pedido) {
  return pedidos.some(actual => actual.id === pedido.id) ? pedidos.map(actual => (actual.id === pedido.id ? pedido : actual)) : [pedido, ...pedidos];
}
