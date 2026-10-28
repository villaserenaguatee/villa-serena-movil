import '../global.css';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clearSession, sessionSnapshot, onSessionCleared, readSession, subscribeSession } from '../lib/sesion';
import { puedeLimpieza, puedeMantenimiento, verificarPersonal } from '../lib/api/personal';
import { listenNotificationResponses } from '../lib/notificaciones';
import { registrarDispositivo } from '../lib/api/push';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
export default function RootLayout() {
  const session = useSyncExternalStore(subscribeSession, sessionSnapshot, () => null);
  const empleado = session?.empleado;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void readSession().then(async saved => { if (saved?.empleado) await verificarPersonal(); })
      .catch(() => clearSession()).finally(() => setReady(true));
  }, []);
  // Con sesión se registra el token push; un rechazo de permiso o un error no bloquea la app.
  useEffect(() => { if (session && !empleado) void registrarDispositivo().catch(() => undefined); }, [session, empleado]);
  useEffect(() => onSessionCleared(() => { queryClient.clear(); if (ready) router.replace('/'); }), [ready]);
  useEffect(() => {
    let disposed = false;
    let remove: (() => void) | undefined;
    if (empleado) return;
    void listenNotificationResponses(route => { void readSession().then(tokens => { if (tokens && !tokens.empleado) router.push(route); }); }).then(cleanup => {
      if (disposed) cleanup(); else remove = cleanup;
    }).catch(() => { /* La aplicación sigue disponible sin notificaciones. */ });
    return () => { disposed = true; remove?.(); };
  }, [empleado]);
  if (!ready) return null;
  return <QueryClientProvider client={queryClient}>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f8f6f0' }, headerTintColor: '#0d2d52', contentStyle: { backgroundColor: '#f8f6f0' } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={!empleado}>
        <Stack.Screen name="acceso" options={{ title: 'Acceso del huésped' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="acceso-personal" options={{ title: 'Acceso del personal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !empleado}>
      <Stack.Screen name="cuenta" options={{ title: "Mi cuenta" }} />
      <Stack.Screen name="checkout" options={{ title: "Check-out" }} />
      <Stack.Screen name="factura" options={{ title: "Tu factura", headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="reservas" options={{ title: "Mis reservas" }} />
      <Stack.Screen name="estadia" options={{ title: "Mi estadía" }} />
      <Stack.Screen name="room-service" options={{ title: "Room Service" }} />
      <Stack.Screen name="pedidos" options={{ title: "Mis pedidos" }} />
      <Stack.Screen name="solicitudes" options={{ title: "Mis solicitudes" }} />
      </Stack.Protected>
      <Stack.Protected guard={!!empleado}>
        <Stack.Screen name="personal/contrasena" options={{ title: 'Contraseña del personal', headerBackVisible: !empleado?.debeCambiarContrasena, gestureEnabled: !empleado?.debeCambiarContrasena }} />
        <Stack.Protected guard={!!empleado && !empleado.debeCambiarContrasena}>
          <Stack.Screen name="personal/index" options={{ title: 'Operación del hotel' }} />
          <Stack.Protected guard={empleado?.rol === 'ROOM_SERVICE'}>
            <Stack.Screen name="personal/room-service" options={{ title: 'Room Service · Personal' }} />
            <Stack.Screen name="personal/pedido" options={{ title: 'Detalle del pedido' }} />
          </Stack.Protected>
          <Stack.Protected guard={!!empleado && puedeLimpieza(empleado)}>
            <Stack.Screen name="personal/limpieza" options={{ title: 'Limpieza · Personal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!!empleado && puedeMantenimiento(empleado)}>
            <Stack.Screen name="personal/mantenimiento" options={{ title: 'Mantenimiento · Personal' }} />
            <Stack.Screen name="personal/incidencia" options={{ title: 'Detalle de incidencia' }} />
          </Stack.Protected>
          <Stack.Protected guard={empleado?.rol === 'MANTENIMIENTO_LIMPIEZA'}>
            <Stack.Screen name="personal/reportar" options={{ title: 'Reportar incidencia' }} />
          </Stack.Protected>
        </Stack.Protected>
      </Stack.Protected>
      <Stack.Screen name="prueba-notificaciones" options={{ title: "Prueba de notificaciones" }} />
    </Stack>
  </QueryClientProvider>;
}
