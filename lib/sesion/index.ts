import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import type { components } from '../api/schema';
// Contrato `Tokens`: común a personal y huésped.
export const tokensSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1), tipoToken: z.literal('Bearer'), expiraEn: z.number().int().positive() });
export type Tokens = components['schemas']['Tokens'];
const KEY = 'villaserena.session';
const listeners = new Set<() => void>();
const activeListeners = new Set<() => void>();
let active = false;
function setActive(value: boolean) {
  if (active === value) return;
  active = value;
  activeListeners.forEach(listener => listener());
}
// Para useSyncExternalStore: refleja si hay tokens guardados tras la última lectura o escritura.
export function subscribeSession(listener: () => void) {
  activeListeners.add(listener);
  return () => { activeListeners.delete(listener); };
}
export function isSessionActive() { return active; }
export function onSessionCleared(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export async function readSession(): Promise<Tokens | null> {
  const value = await SecureStore.getItemAsync(KEY);
  if (!value) { setActive(false); return null; }
  try { const tokens = tokensSchema.parse(JSON.parse(value)); setActive(true); return tokens; }
  catch { await clearSession(); return null; }
}
export async function saveSession(tokens: Tokens) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokensSchema.parse(tokens)));
  setActive(true);
}
export async function clearSession() {
  try { await SecureStore.deleteItemAsync(KEY); }
  finally { setActive(false); listeners.forEach(listener => listener()); }
}
