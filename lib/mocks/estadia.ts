import { getAccount } from './cuenta';
// Prototipo local: no emite JWT ni envía correo. Adaptar al OpenAPI del equipo.
export const DEMO_EMAIL = 'ana@example.com';
export const DEMO_CODE = '123456';
export type Stay = { id: string; code: string; arrival: string; departure: string; type: string; guests: number; room: string | null; status: 'EN_ESTADIA' | 'CONFIRMADA' | 'FINALIZADA' };
export const stays: Stay[] = [
  { id: 'actual', code: 'VS-DEMO-001', arrival: '2026-10-06', departure: '2026-10-08', type: 'Suite jardín', guests: 2, room: '204', status: 'EN_ESTADIA' },
  { id: 'proxima', code: 'VS-DEMO-002', arrival: '2026-11-10', departure: '2026-11-12', type: 'Habitación doble', guests: 2, room: null, status: 'CONFIRMADA' },
];
let challenge: { email: string; expires: number; used: boolean; failures: number; blockedUntil: number } | null = null;
const accessAttempts = new Map<string, { failures: number; blockedUntil: number }>();
let session = false;
const sessionListeners = new Set<() => void>();
export function subscribeDemoSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => { sessionListeners.delete(listener); };
}
export function openDemoSession() { session = true; sessionListeners.forEach(listener => listener()); }
export function requestDemoCode(email: string, now = Date.now()) {
  const attempts = accessAttempts.get(email);
  if (attempts && attempts.blockedUntil > now) throw new Error('El acceso está bloqueado por 15 minutos. Intenta más tarde.');
  const state = attempts?.blockedUntil && attempts.blockedUntil <= now ? { failures: 0, blockedUntil: 0 } : attempts ?? { failures: 0, blockedUntil: 0 };
  accessAttempts.set(email, state);
  challenge = { email, expires: now + 10 * 60_000, used: false, ...state };
  return 'Si el correo tiene reservas, recibirás un código para entrar.';
}
export function verifyDemoCode(code: string, now = Date.now()) {
  if (!challenge) throw new Error('Pide un código para entrar.');
  if (challenge.blockedUntil > now) throw new Error('El acceso está bloqueado por 15 minutos. Intenta más tarde.');
  if (challenge.used || now >= challenge.expires) throw new Error('El código venció o ya fue usado. Pide otro código.');
  if (code !== DEMO_CODE || challenge.email !== DEMO_EMAIL) {
    challenge.failures++;
    accessAttempts.set(challenge.email, { failures: challenge.failures, blockedUntil: challenge.blockedUntil });
    if (challenge.failures >= 5) { challenge.blockedUntil = now + 15 * 60_000; accessAttempts.set(challenge.email, { failures: challenge.failures, blockedUntil: challenge.blockedUntil }); throw new Error('El acceso está bloqueado por 15 minutos. Intenta más tarde.'); }
    throw new Error('El código no es válido. Revisa los seis dígitos.');
  }
  accessAttempts.delete(challenge.email);
  challenge.used = true; openDemoSession();
  return stays.find(stay => stay.status === 'EN_ESTADIA')?.id;
}
export function isDemoSession() { return session; }
export function closeDemoSession() { session = false; sessionListeners.forEach(listener => listener()); }

export async function getStays(): Promise<Stay[]> {
  const account = await getAccount();
  return stays.map(stay => ({ ...stay, status: stay.id === 'actual' ? account.reservation : stay.status }));
}
