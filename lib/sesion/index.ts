import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import type { components } from '../api/schema';
// Contrato parte 1; compartido con el acceso del huésped cuando llegue parte 2.
export const tokensSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1), tipoToken: z.literal('Bearer'), expiraEn: z.number().int().positive() });
export type Tokens = components['schemas']['Tokens'];
const KEY = 'villaserena.session';
const listeners = new Set<() => void>();
export function onSessionCleared(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export async function readSession(): Promise<Tokens | null> {
  const value = await SecureStore.getItemAsync(KEY);
  if (!value) return null;
  try { return tokensSchema.parse(JSON.parse(value)); }
  catch { await clearSession(); return null; }
}
export async function saveSession(tokens: Tokens) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokensSchema.parse(tokens)));
}
export async function clearSession() {
  try { await SecureStore.deleteItemAsync(KEY); }
  finally { listeners.forEach(listener => listener()); }
}
