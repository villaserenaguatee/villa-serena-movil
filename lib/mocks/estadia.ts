// Sesión local de la cuenta de prueba (OBJ-4D). El acceso real usa lib/api/huesped.
let session = false;
const sessionListeners = new Set<() => void>();
export function subscribeDemoSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => { sessionListeners.delete(listener); };
}
export function openDemoSession() { session = true; sessionListeners.forEach(listener => listener()); }
export function isDemoSession() { return session; }
export function closeDemoSession() { session = false; sessionListeners.forEach(listener => listener()); }
