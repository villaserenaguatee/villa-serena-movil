import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Action, dateLabel, money, Notice, useCarga } from '../components/cuenta';
import { reservaActual } from '../lib/api/huesped';
import { aplicarPedido, estadoPedidoLabel, listarPedidos } from '../lib/api/pedidos';
import { suscribirPedidos } from '../lib/tiempo-real';
export default function Orders() {
  const { codigo: param } = useLocalSearchParams<{ codigo?: string }>();
  const { data: orders, setData, refreshing, error, reload } = useCarga(useCallback(async () => listarPedidos(await reservaActual(param)), [param]));
  const [live, setLive] = useState(false);
  // HU-HUE-11: estados en vivo mientras la pantalla está abierta; sin cancelar ni modificar desde la app.
  useFocusEffect(useCallback(() => suscribirPedidos({
    recargar: reload,
    alActualizar: pedido => setData(actuales => aplicarPedido(actuales ?? [], pedido)),
    alCambiarConexion: setLive,
  }), [reload, setData]));
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
    <Text accessibilityRole="header" className="text-3xl text-navy">Mis pedidos</Text>
    <Text className="mb-6 mt-2 text-xs text-muted">{live ? 'Actualización en vivo' : 'Conectando para actualizar en vivo…'}</Text>
    {error ? <><Notice text={error} /><Action label="Reintentar" onPress={reload} /></> : null}
    {orders && !orders.length ? <Text className="text-muted">Todavía no tienes pedidos.</Text> : null}
    {orders?.map(order => <View key={order.id} className="mb-4 gap-3 rounded-2xl bg-white p-5">
      <Text className="text-lg font-semibold text-navy">{estadoPedidoLabel[order.estado]}</Text>
      <Text className="text-muted">{dateLabel(order.creadoEn)}</Text>
      <Text className="text-base text-navy">{order.items.map(item => `${item.nombre} × ${item.cantidad}`).join(', ')}</Text>
      {order.notas ? <Text className="text-muted">Notas: {order.notas}</Text> : null}
      <Text className="font-semibold text-navy">{money(order.total)}</Text>
      {order.estado === 'CANCELADO' ? <Text className="text-sm text-muted">Cancelado{order.motivoCancelacion ? `: ${order.motivoCancelacion}` : '.'}</Text> : null}
    </View>)}
  </ScrollView></SafeAreaView>;
}
