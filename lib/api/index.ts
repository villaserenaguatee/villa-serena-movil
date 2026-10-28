import { clearSession, readSession, saveSession, tokensSchema } from '../sesion';
import type { components } from './schema';

export type Schemas = components['schemas'];
// Error del contrato (`Error`): código estable y mensaje en español para mostrar.
export class ApiError extends Error {
  constructor(readonly status: number, readonly codigo: string, message: string, readonly detalles: Schemas['DetalleError'][] = []) { super(message); }
}

function baseUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!value) throw new Error('Configura EXPO_PUBLIC_API_URL en tu archivo .env.');
  return value.replace(/\/+$/, '');
}
let refreshInFlight: Promise<void> | null = null;
async function renewSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const session = await readSession();
        if (!session) throw new ApiError(401, 'SESION_VENCIDA', 'No hay sesión activa.');
        // renovarSesion: común a personal y huésped según el contrato.
        const response = await fetch(`${baseUrl()}/api/v1/auth/renovar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
        if (!response.ok) throw new ApiError(401, 'SESION_VENCIDA', 'Tu sesión venció. Inicia sesión de nuevo.');
        await saveSession({ ...tokensSchema.parse(await response.json()), ...(session.empleado ? { empleado: session.empleado } : {}) });
      } catch (error) { await clearSession(); throw error; }
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}
export async function apiRequest(path: string, options: RequestInit = {}, authenticated = true): Promise<Response> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Usa una ruta relativa del API.');
  const send = async () => {
    const headers = new Headers(options.headers);
    if (authenticated) {
      const session = await readSession();
      headers.delete('Authorization');
      if (session) headers.set('Authorization', `Bearer ${session.accessToken}`);
    }
    return fetch(`${baseUrl()}${path}`, { ...options, headers });
  };
  let response = await send();
  if (authenticated && response.status === 401) {
    await renewSession();
    response = await send();
    if (response.status === 401) await clearSession();
  }
  return response;
}
// Envía JSON y devuelve el cuerpo; ante un estado no exitoso lanza ApiError con el mensaje del servidor.
export async function apiJson<T>(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}, authenticated = true): Promise<T> {
  const headers = new Headers({ ...options.headers, Accept: 'application/json' });
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await apiRequest(path, { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) }, authenticated);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'SIN_CONEXION', 'No pudimos conectar con el hotel. Revisa tu conexión e intenta de nuevo.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as Partial<Schemas['Error']> | null;
    throw new ApiError(response.status, body?.codigo ?? `HTTP_${response.status}`, body?.mensaje ?? 'Ocurrió un error. Intenta de nuevo.', body?.detalles ?? []);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}
export async function checkApiHealth() {
  const response = await apiRequest('/actuator/health', {}, false);
  if (!response.ok) throw new Error(`El API respondió HTTP ${response.status}.`);
  return response.json() as Promise<{ status: string }>;
}
