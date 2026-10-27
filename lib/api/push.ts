import * as SecureStore from 'expo-secure-store';

import { obtenerTokenPush } from '../notificaciones';
import { apiJson, type Schemas } from './index';

// HU-HUE-17: el token se liga al huésped autenticado; sin permiso o sin APK de desarrollo la app sigue igual.
const KEY = 'villaserena.push';

export async function registrarDispositivo() {
  let tokenExpo: string;
  try { tokenExpo = await obtenerTokenPush(); } catch { return null; }
  const body: Schemas['DispositivoPushPeticion'] = { tokenExpo };
  const { id } = await apiJson<Schemas['DispositivoPushRegistrado']>('/api/v1/app/dispositivos-push', { method: 'POST', body });
  await SecureStore.setItemAsync(KEY, String(id));
  return id;
}

// Al cerrar sesión: baja en el servidor (mejor esfuerzo) y olvido local.
export async function darDeBajaDispositivo() {
  const id = await SecureStore.getItemAsync(KEY);
  try { if (id) await apiJson<void>(`/api/v1/app/dispositivos-push/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
  finally { await olvidarDispositivo(); }
}

// Tras el check-out el servidor ya borró los tokens; solo se olvida el identificador local.
export async function olvidarDispositivo() { await SecureStore.deleteItemAsync(KEY); }
