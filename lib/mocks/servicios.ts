// Prototipo de pantallas: no conecta Room Service/Limpieza ni WebSocket.
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
export const articles = [{ id: 'toalla', name: 'Toalla de baño', max: 4 }, { id: 'mano', name: 'Toalla de mano', max: 4 }, { id: 'almohada', name: 'Almohada', max: 2 }, { id: 'cobija', name: 'Cobija', max: 2 }, { id: 'papel', name: 'Papel higiénico', max: 4 }, { id: 'jabon', name: 'Jabón', max: 3 }];
export type DemoRequest = { id: string; date: string; type: 'LIMPIEZA' | 'ARTICULOS'; comment: string; description: string; status: 'PENDIENTE' | 'EN_PROCESO' | 'ATENDIDA' | 'CANCELADA' };
let requests: DemoRequest[] = [];
export async function getRequests() {
  if ((await getAccount()).reservation === 'FINALIZADA') requests = requests.map(value => value.status === 'PENDIENTE' || value.status === 'EN_PROCESO' ? { ...value, status: 'CANCELADA' } : value);
  return requests.map(value => ({ ...value }));
}
export async function requestCleaning(comment: string) {
  await requireStay();
  if (requests.some(value => value.type === 'LIMPIEZA' && (value.status === 'PENDIENTE' || value.status === 'EN_PROCESO'))) throw new Error('Ya hay una solicitud de limpieza en curso para tu habitación.');
  requests.push({ id: `s-demo-${nextId++}`, date: DEMO_NOW, type: 'LIMPIEZA', comment: comment.trim(), description: 'Limpieza de habitación', status: 'PENDIENTE' });
}
export async function requestArticles(counts: Record<string, number>) {
  await requireStay();
  const selected = articles.filter(item => (counts[item.id] ?? 0) > 0);
  if (!selected.length) throw new Error('Elige al menos un artículo.');
  if (selected.some(item => !Number.isInteger(counts[item.id]) || counts[item.id] > item.max)) throw new Error('Revisa las cantidades máximas de los artículos.');
  requests.push({ id: `s-demo-${nextId++}`, date: DEMO_NOW, type: 'ARTICULOS', comment: '', description: selected.map(item => `${item.name} × ${counts[item.id]}`).join(', '), status: 'PENDIENTE' });
}
export async function cancelRequest(id: string) {
  const request = requests.find(value => value.id === id);
  if (!request || request.status !== 'PENDIENTE') throw new Error('Solo puedes cancelar solicitudes pendientes.');
  request.status = 'CANCELADA';
}
