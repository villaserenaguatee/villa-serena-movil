// stompjs usa TextEncoder y TextDecoder; Hermes no garantiza ambos.
import 'fast-text-encoding';
import { Client } from '@stomp/stompjs';

import type { Schemas } from '../api';
import { readSession } from '../sesion';

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
