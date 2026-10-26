import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Pide permiso si hace falta y devuelve el Expo push token; falla en Expo Go, web o sin proyecto EAS.
export async function obtenerTokenPush(): Promise<string> {
  if (Platform.OS !== 'android') throw new Error('Esta prueba se realiza en la app Android instalada.');
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error('Expo Go no admite esta prueba. Instala el APK de desarrollo generado con EAS.');
  }
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('Falta vincular el proyecto con Expo. Ejecuta eas init antes de generar el APK.');
  // Se cargan solo en Android con development build, nunca al abrir la web.
  const Device = await import('expo-device');
  if (!Device.isDevice) throw new Error('Para esta prueba usa tu teléfono Android físico.');
  const Notifications = await import('expo-notifications');
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Estadía', importance: Notifications.AndroidImportance.MAX,
  });
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('No concediste permiso. Puedes usar la app y habilitar notificaciones después en Ajustes.');
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export const requestTestPushToken = obtenerTokenPush;

export type NotificationRoute = { pathname: '/pedidos' | '/solicitudes'; params: { codigo?: string } };
// x-push: `pantalla` elige una ruta interna conocida y `codigoReserva` la reserva; no se abren otras URL.
export function notificationRoute(data: Record<string, unknown>): NotificationRoute | null {
  const pathname = data.pantalla === 'pedidos' ? '/pedidos' : data.pantalla === 'solicitudes' ? '/solicitudes' : null;
  if (!pathname) return null;
  const codigo = typeof data.codigoReserva === 'string' && /^VS-[A-Z0-9]{6}$/.test(data.codigoReserva) ? data.codigoReserva : undefined;
  return { pathname, params: codigo ? { codigo } : {} };
}
export async function listenNotificationResponses(open: (route: NotificationRoute) => void): Promise<() => void> {
  if (Platform.OS !== 'android' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return () => {};
  const Notifications = await import('expo-notifications');
  let disposed = false;
  const handled = new Set<string>();
  const handle = (response: import('expo-notifications').NotificationResponse) => {
    const id = response.notification.request.identifier;
    if (disposed || handled.has(id)) return;
    const route = notificationRoute(response.notification.request.content.data);
    if (route) { handled.add(id); open(route); }
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) handle(response);
  } catch { /* Escuchar las próximas respuestas aunque no exista respuesta inicial. */ }
  return () => { disposed = true; subscription.remove(); };
}
