import '../global.css';
import { useEffect, useSyncExternalStore } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onSessionCleared } from '../lib/sesion';
import { closeDemoSession, isDemoSession, subscribeDemoSession } from '../lib/mocks/estadia';
import { listenNotificationResponses } from '../lib/notificaciones';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
export default function RootLayout() {
  const signedIn = useSyncExternalStore(subscribeDemoSession, isDemoSession, () => false);
  useEffect(() => onSessionCleared(() => { queryClient.clear(); closeDemoSession(); router.replace('/'); }), []);
  useEffect(() => {
    let disposed = false;
    let remove: (() => void) | undefined;
    void listenNotificationResponses(path => { if (isDemoSession()) router.push(path); }).then(cleanup => {
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
