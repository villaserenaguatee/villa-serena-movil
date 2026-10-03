// Datos de prueba de OBJ-4D. Reemplazar este adaptador por el contrato aprobado.
export type Charge = { id: string; date: string; concept: string; cents: number; status: 'VIGENTE' | 'ANULADO' };
export type Payment = { id: string; date: string; method: string; cents: number; status: 'APROBADO' | 'PENDIENTE' | 'FALLIDO' | 'REEMBOLSADO' };
export type Account = { guest: string; code: string; room: string; departure: string; reservation: 'EN_ESTADIA' | 'FINALIZADA' | 'CONFIRMADA'; status: 'ABIERTA' | 'CERRADA'; charges: Charge[]; payments: Payment[]; orders: { id: string; status: 'NUEVO' | 'EN_PREPARACION' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO' }[]; invoice?: { number: string; buyer: string; nit: string; pdfUrl?: string } };
export const DEMO_NOW = '2026-10-08T16:00:00Z'; // 10:00 en Guatemala.
export const initialAccount: Account = {
  guest: 'Ana Morales', code: 'VS-DEMO-001', room: '204 · Suite jardín', departure: '2026-10-08', reservation: 'EN_ESTADIA', status: 'ABIERTA',
  charges: [
    { id: 'c1', date: '2026-10-06T21:00:00Z', concept: 'Alojamiento · 2 noches', cents: 180000, status: 'VIGENTE' },
    { id: 'c2', date: '2026-10-07T19:30:00Z', concept: 'Room Service · Almuerzo', cents: 12500, status: 'VIGENTE' },
    { id: 'c3', date: '2026-10-07T20:00:00Z', concept: 'Servicio adicional', cents: 5000, status: 'ANULADO' },
  ],
  payments: [
    { id: 'p1', date: '2026-10-05T18:00:00Z', method: 'Stripe', cents: 180000, status: 'APROBADO' },
    { id: 'p2', date: '2026-10-07T20:05:00Z', method: 'Stripe', cents: 12500, status: 'FALLIDO' },
  ], orders: [{ id: 'o1', status: 'EN_PREPARACION' }],
};
let account: Account = JSON.parse(JSON.stringify(initialAccount)) as Account;
export function balance(value: Account) {
  return value.charges.filter(c => c.status === 'VIGENTE').reduce((n, c) => n + c.cents, 0)
    - value.payments.filter(p => p.status === 'APROBADO').reduce((n, p) => n + p.cents, 0);
}
export function checkoutBlock(value: Account, now = new Date()) {
  if (value.reservation !== 'EN_ESTADIA' || value.status !== 'ABIERTA') return 'Esta reserva no tiene una estadía activa. Realiza el check-out en Recepción.';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (key: string) => parts.find(p => p.type === key)?.value;
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const seconds = Number(get('hour')) * 3600 + Number(get('minute')) * 60 + Number(get('second'));
  if (date !== value.departure || seconds > 12 * 3600) return 'El check-out en la app está disponible el día de salida, de 00:00 a 12:00 (Guatemala). Acércate a Recepción.';
  if (value.orders.some(o => o.status === 'EN_CAMINO')) return 'Tienes un pedido en camino. Espera su entrega para continuar.';
  return null;
}
export function hasPendingOrders(value: Account) { return value.orders.some(o => o.status === 'NUEVO' || o.status === 'EN_PREPARACION'); }
export function validNit(input: string) {
  const value = input.trim().toUpperCase().replace(/-/g, '');
  if (value.length > 12 || !/^\d+[\dK]$/.test(value)) return false;
  const digits = value.slice(0, -1);
  if (!/[1-9]/.test(digits)) return false;
  const sum = [...digits].reverse().reduce((total, digit, i) => total + Number(digit) * (i + 2), 0);
  const remainder = (11 - sum % 11) % 11;
  return value.at(-1) === (remainder === 10 ? 'K' : String(remainder));
}
export async function getAccount(): Promise<Account> { return JSON.parse(JSON.stringify(account)) as Account; }
export async function startMockPayment() {
  if (checkoutBlock(account, new Date(DEMO_NOW))) throw new Error('El check-out no está disponible.');
  if (balance(account) <= 0) return;
  if (!account.payments.some(p => p.id === 'p-demo')) account.payments.push({ id: 'p-demo', date: DEMO_NOW, method: 'Stripe', cents: balance(account), status: 'PENDIENTE' });
}
export async function approveMockPayment() {
  const payment = account.payments.find(p => p.id === 'p-demo');
  if (payment) payment.status = 'APROBADO';
}
export async function confirmMockCheckout(buyer: string, nit: string, consent: boolean) {
  const reason = checkoutBlock(account, new Date(DEMO_NOW));
  if (reason) throw new Error(reason);
  if (balance(account) !== 0) throw new Error('El saldo debe ser Q 0.00 para confirmar.');
  if (!buyer.trim()) throw new Error('Ingresa el nombre del comprador.');
  if (nit !== 'CF' && !validNit(nit)) throw new Error('El NIT no es válido. Revisa su dígito verificador.');
  if (hasPendingOrders(account) && !consent) throw new Error('Acepta la cancelación de los pedidos pendientes.');
  account = { ...account, reservation: 'FINALIZADA', status: 'CERRADA', orders: account.orders.map(o => o.status === 'NUEVO' || o.status === 'EN_PREPARACION' ? { ...o, status: 'CANCELADO' } : o), invoice: { number: 'DEMO-000001', buyer: buyer.trim(), nit } };
  return getAccount();
}

export async function registerDemoOrder(id: string) {
  if (account.reservation !== 'EN_ESTADIA') throw new Error('La estadía ya finalizó.');
  account.orders.push({ id, status: 'NUEVO' });
}
export async function demoOrderStatuses() { return (await getAccount()).orders; }
