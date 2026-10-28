import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Text } from 'react-native';
import { Action, dateLabel, money, useCarga } from '../../components/cuenta';
import { Campo, Card, PersonalPage, useAccion } from '../../components/personal';
import { avanzarPedido, cancelarPedidoPersonal, pedidoPersonal, siguientePedido } from '../../lib/api/personal';
import { estadoPedidoLabel } from '../../lib/api/pedidos';

export default function PedidoPersonal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carga = useCarga(useCallback(() => pedidoPersonal(Number(id)), [id]));
  const accion = useAccion(carga.reload);
  const [motivo, setMotivo] = useState('');
  const pedido = carga.data;
  const siguiente = pedido && siguientePedido(pedido.estado);
  const disabled = accion.busy || carga.refreshing || !!carga.error;
  return <PersonalPage title={`Pedido #${id}`} error={accion.error || carga.error} refreshing={carga.refreshing} reload={carga.reload}>
    {pedido && <>
      <Card>
        <Text className="text-xl text-navy">Hab. {pedido.habitacion.numero} · Piso {pedido.habitacion.piso}</Text>
        <Text className="text-navy">{pedido.nombreHuesped} · {estadoPedidoLabel[pedido.estado]}</Text>
        {pedido.notas ? <Text className="font-semibold text-navy">Notas: {pedido.notas}</Text> : null}
        {pedido.items.map(item => <Text key={item.itemId} className="text-navy">{item.cantidad} × {item.nombre} · {money(item.subtotal)}</Text>)}
        <Text className="text-xl font-semibold text-navy">Total: {money(pedido.total)}</Text>
        {pedido.motivoCancelacion ? <Text className="text-navy">Cancelación: {pedido.motivoCancelacion}</Text> : null}
      </Card>
      {siguiente && <>
        <Action label={`Marcar ${estadoPedidoLabel[siguiente].toLowerCase()}`} disabled={disabled} onPress={() => {
          const work = () => { void accion.run(() => avanzarPedido(pedido.id, pedido.estado)); };
          if (siguiente === 'ENTREGADO') Alert.alert('Confirmar entrega', 'Se registrará la entrega y su cargo en la cuenta.', [{ text: 'Volver', style: 'cancel' }, { text: 'Confirmar entrega', onPress: work }]); else work();
        }} />
        <Campo label="Motivo de cancelación" value={motivo} onChange={setMotivo} multiline maxLength={500} />
        <Action label="Cancelar pedido" secondary disabled={disabled || !motivo.trim()} onPress={() => Alert.alert('Cancelar pedido', 'Esta acción requiere motivo y no se puede deshacer.', [{ text: 'Volver', style: 'cancel' }, { text: 'Cancelar pedido', style: 'destructive', onPress: () => { void accion.run(() => cancelarPedidoPersonal(pedido.id, motivo)); } }])} />
      </>}
      <Text className="text-xl text-navy">Historial</Text>
      {pedido.historial.map((h, i) => <Text key={i} className="text-muted">{dateLabel(h.fechaHora)} · {h.estadoNuevo} · {h.responsable}{h.motivo ? ` · ${h.motivo}` : ''}</Text>)}
    </>}
  </PersonalPage>;
}
