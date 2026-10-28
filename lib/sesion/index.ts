import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import type { components } from '../api/schema';
// Contrato `Tokens`: común a personal y huésped.
export const tokensSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1), tipoToken: z.literal('Bearer'), expiraEn: z.number().int().positive() });
export type Tokens = components['schemas']['Tokens'];
export const empleadoSchema = z.object({
  id: z.number().int().positive(), nombre: z.string(), correo: z.string(),
  rol: z.enum(['ADMIN', 'RECEPCION', 'ROOM_SERVICE', 'MANTENIMIENTO_LIMPIEZA']),
  area: z.enum(['LIMPIEZA', 'MANTENIMIENTO', 'AMBAS']).nullable(), debeCambiarContrasena: z.boolean(),
});
export type Empleado = components['schemas']['EmpleadoSesion'];
export type Sesion = Tokens & { empleado?: Empleado };
const sessionSchema = tokensSchema.extend({ empleado: empleadoSchema.optional() });
const KEY = 'villaserena.session';
const listeners = new Set<() => void>();
const activeListeners = new Set<() => void>();
let active = false;
let snapshot: Sesion | null = null;
function setSession(value: Sesion | null) {
  if (JSON.stringify(snapshot) === JSON.stringify(value)) return;
  snapshot = value;
  active = value !== null;
  activeListeners.forEach(listener => listener());
}
// Para useSyncExternalStore: refleja si hay tokens guardados tras la última lectura o escritura.
export function subscribeSession(listener: () => void) {
  activeListeners.add(listener);
  return () => { activeListeners.delete(listener); };
}
export function isSessionActive() { return active; }
export function sessionSnapshot() { return snapshot; }
export function onSessionCleared(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export async function readSession(): Promise<Sesion | null> {
  const value = await SecureStore.getItemAsync(KEY);
  if (!value) { setSession(null); return null; }
  try { const session = sessionSchema.parse(JSON.parse(value)); setSession(session); return session; }
  catch { await clearSession(); return null; }
}
export async function saveSession(tokens: Sesion) {
  const session = sessionSchema.parse(tokens);
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  setSession(session);
}
export async function clearSession() {
  try { await SecureStore.deleteItemAsync(KEY); }
  finally { setSession(null); listeners.forEach(listener => listener()); }
}
