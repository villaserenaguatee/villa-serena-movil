// stompjs usa TextEncoder y TextDecoder; Hermes no garantiza ambos.
import 'fast-text-encoding';
import { Client } from '@stomp/stompjs';

import type { Schemas } from '../api';
import { readSession } from '../sesion';
import type { Empleado } from '../sesion';
import { puedeLimpieza, ticketPersonal } from '../api/personal';

export type EventoPedido = Schemas['EventoEstadoPedidoHuesped'];

// x-websocket: endpoint /ws en el mismo origen del API, STOMP sobre WebSocket nativo.
export function urlWebSocket(apiUrl: string) { return `${apiUrl.trim().replace(/\/+$/, '').replace(/^http/, 'ws')}/ws`; }

// Suscribe la cola privada del huésped. Al conectar o reconectar se recarga la lista por GET;
// ante un rechazo del servidor también, para que el cliente HTTP renueve el token antes del siguiente intento.
export function suscribirPedidos({ recargar, alActualizar, alCambiarConexion }: {
  recargar: () => Promise<unknown>; alActualizar: (pedido: EventoPedido['datos']) => void; alCambiarConexion: (enVivo: boolean) => void;
}) {
  const client = new Client({
    brokerURL: urlWebSocket(process.env.EXPO_PUBLIC_API_URL ?? ''),
    reconnectDelay: 5000, heartbeatIncoming: 10000, heartbeatOutgoing: 10000,
    forceBinaryWSFrames: true, appendMissingNULLonIncoming: true,
    beforeConnect: async () => {
      const session = await readSession().catch(() => null);
      client.connectHeaders = session ? { Authorization: `Bearer ${session.accessToken}` } : {};
    },
    onConnect: () => {
      client.subscribe('/user/queue/pedidos', message => {
        try {
          const evento = JSON.parse(message.body) as EventoPedido;
          if (evento.tipo === 'PEDIDO_ACTUALIZADO') alActualizar(evento.datos);
        } catch { /* Se ignora un mensaje que no cumple el contrato. */ }
      });
      alCambiarConexion(true);
      void recargar().catch(() => undefined);
    },
    onStompError: () => { alCambiarConexion(false); void recargar().catch(() => undefined); },
    onWebSocketClose: () => alCambiarConexion(false),
  });
  client.activate();
  return () => { void client.deactivate(); };
}

export function destinosPersonal(empleado: Empleado) {
  if (empleado.debeCambiarContrasena) return [];
  if (empleado.rol === 'ROOM_SERVICE') return ['/topic/pedidos'];
  return puedeLimpieza(empleado) ? ['/topic/habitaciones', '/topic/solicitudes'] : [];
}
// El personal nativo también usa ticket: el API no acepta su JWT en CONNECT.
export function suscribirPersonal(empleado: Empleado, recargar: () => Promise<unknown>, conexion: (activa: boolean) => void) {
  const destinos = destinosPersonal(empleado);
  if (!destinos.length) return () => {};
  let disposed = false;
  const client = new Client({
    brokerURL: urlWebSocket(process.env.EXPO_PUBLIC_API_URL ?? ''),
    reconnectDelay: 5000, heartbeatIncoming: 10000, heartbeatOutgoing: 10000,
    forceBinaryWSFrames: true, appendMissingNULLonIncoming: true,
    beforeConnect: async () => {
      client.connectHeaders = {};
      try {
        const { ticket } = await ticketPersonal();
        if (!disposed) client.connectHeaders = { ticket };
      } catch { conexion(false); }
    },
    onConnect: () => {
      destinos.forEach(destino => client.subscribe(destino, () => { void recargar().catch(() => undefined); }));
      conexion(true);
      void recargar().catch(() => undefined);
    },
    onStompError: () => { conexion(false); void recargar().catch(() => undefined); },
    onWebSocketClose: () => conexion(false),
  });
  client.activate();
  return () => { disposed = true; void client.deactivate(); };
}
