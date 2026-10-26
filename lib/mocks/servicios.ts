// Prototipo de Room Service: no conecta con el API ni WebSocket.
import { DEMO_NOW, getAccount, registerDemoOrder } from './cuenta';
export const menu = [
  { id: 'm1', category: 'Desayunos', name: 'Desayuno de la casa', description: 'Huevos, frijoles, plátanos y pan.', cents: 7500, available: true },
  { id: 'm2', category: 'Platos fuertes', name: 'Pollo a la parrilla', description: 'Con vegetales y arroz.', cents: 12500, available: true },
  { id: 'm3', category: 'Bebidas', name: 'Café de Guatemala', description: 'Café recién preparado.', cents: 2500, available: true },
  { id: 'm4', category: 'Postres', name: 'Pastel de chocolate', description: 'Porción de pastel de la casa.', cents: 4500, available: false },
];
export type DemoOrder = { id: string; date: string; cents: number; notes: string; description: string };
let nextId = 1;
let orders: DemoOrder[] = [{ id: 'o1', date: '2026-10-08T15:00:00Z', cents: 7500, notes: '', description: 'Desayuno de la casa × 1' }];
async function requireStay() { if ((await getAccount()).reservation !== 'EN_ESTADIA') throw new Error('Este servicio solo está disponible durante la estadía.'); }
export async function placeOrder(cart: Record<string, number>, notes: string) {
  await requireStay();
  const items = Object.entries(cart).filter(([, count]) => count > 0);
  if (!items.length) throw new Error('Agrega al menos un artículo al pedido.');
  let cents = 0;
  const descriptions = items.map(([id, count]) => {
    const item = menu.find(value => value.id === id);
    if (!item?.available) throw new Error(`Quita del carrito el artículo agotado: ${item?.name ?? id}.`);
    if (!Number.isInteger(count) || count < 1) throw new Error('La cantidad no es válida.');
    cents += item.cents * count; return `${item.name} × ${count}`;
  });
  const id = `o-demo-${nextId++}`;
  await registerDemoOrder(id);
  orders.push({ id, date: DEMO_NOW, cents, notes: notes.trim(), description: descriptions.join(', ') });
}
export async function getOrders() {
  const account = await getAccount();
  return orders.map(order => ({ ...order, status: account.orders.find(value => value.id === order.id)?.status ?? 'NUEVO' }));
}
