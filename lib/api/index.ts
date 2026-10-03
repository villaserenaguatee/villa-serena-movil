import { clearSession, readSession, saveSession, tokensSchema } from '../sesion';

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
        if (!session) throw new Error('No hay sesión activa.');
        // Petición definida en openapi.yaml, parte 1.
        const response = await fetch(`${baseUrl()}/api/v1/auth/renovar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
        if (!response.ok) throw new Error('La sesión venció.');
        await saveSession(tokensSchema.parse(await response.json()));
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
export async function checkApiHealth() {
  const response = await apiRequest('/actuator/health', {}, false);
  if (!response.ok) throw new Error(`El API respondió HTTP ${response.status}.`);
  return response.json() as Promise<{ status: string }>;
}
