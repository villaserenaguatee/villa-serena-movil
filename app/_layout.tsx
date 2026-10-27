import '../global.css';
import { useEffect, useSyncExternalStore } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isSessionActive, onSessionCleared, readSession, subscribeSession } from '../lib/sesion';
import { listenNotificationResponses } from '../lib/notificaciones';
import { registrarDispositivo } from '../lib/api/push';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
export default function RootLayout() {
  const signedIn = useSyncExternalStore(subscribeSession, isSessionActive, () => false);
  useEffect(() => { void readSession().catch(() => { /* Sin sesión guardada legible. */ }); }, []);
  // Con sesión se registra el token push; un rechazo de permiso o un error no bloquea la app.
  useEffect(() => { if (signedIn) void registrarDispositivo().catch(() => undefined); }, [signedIn]);
  useEffect(() => onSessionCleared(() => { queryClient.clear(); router.replace('/'); }), []);
  useEffect(() => {
    let disposed = false;
    let remove: (() => void) | undefined;
    void listenNotificationResponses(route => { void readSession().then(tokens => { if (tokens) router.push(route); }); }).then(cleanup => {
      if (disposed) cleanup(); else remove = cleanup;
    }).catch(() => { /* La aplicación sigue disponible sin notificaciones. */ });
    return () => { disposed = true; remove?.(); };
  }, []);
  return <QueryClientProvider client={queryClient}>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f8f6f0' }, headerTintColor: '#0d2d52', contentStyle: { backgroundColor: '#f8f6f0' } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="acceso" options={{ title: 'Acceso del huésped' }} />
      <Stack.Protected guard={signedIn}>
      <Stack.Screen name="cuenta" options={{ title: "Mi cuenta" }} />
      <Stack.Screen name="checkout" options={{ title: "Check-out" }} />
      <Stack.Screen name="factura" options={{ title: "Tu factura", headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="reservas" options={{ title: "Mis reservas" }} />
      <Stack.Screen name="estadia" options={{ title: "Mi estadía" }} />
      <Stack.Screen name="room-service" options={{ title: "Room Service" }} />
      <Stack.Screen name="pedidos" options={{ title: "Mis pedidos" }} />
      <Stack.Screen name="solicitudes" options={{ title: "Mis solicitudes" }} />
      </Stack.Protected>
      <Stack.Screen name="prueba-notificaciones" options={{ title: "Prueba de notificaciones" }} />
    </Stack>
  </QueryClientProvider>;
}
