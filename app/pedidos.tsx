import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Action, dateLabel, money, Notice } from '../components/cuenta';
import { getOrders } from '../lib/mocks/servicios';
const labels = { NUEVO: 'Nuevo', EN_PREPARACION: 'En preparación', EN_CAMINO: 'En camino', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado' };
export default function Orders() {
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof getOrders>>>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const reload = useCallback(async () => { setBusy(true); try { setOrders(await getOrders()); setError(''); } catch { setError('No pudimos cargar los pedidos.'); } finally { setBusy(false); } }, []);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={reload} />}>
    <Notice text="Pedidos de prueba. El seguimiento en vivo y los avisos esperan el WebSocket y el API del equipo." />
    <Text accessibilityRole="header" className="mb-6 text-3xl text-navy">Mis pedidos</Text>
    {error ? <><Notice text={error} /><Action label="Reintentar" onPress={reload} /></> : null}
    {orders.map(order => <View key={order.id} className="mb-4 gap-3 rounded-2xl bg-white p-5"><Text className="text-lg font-semibold text-navy">{labels[order.status]}</Text><Text className="text-muted">{dateLabel(order.date)}</Text><Text className="text-base text-navy">{order.description}</Text>{order.notes ? <Text className="text-muted">Notas: {order.notes}</Text> : null}<Text className="font-semibold text-navy">{money(order.cents)}</Text>{order.status === 'CANCELADO' ? <Text className="text-sm text-muted">Cancelado al finalizar la estadía.</Text> : null}</View>)}
  </ScrollView></SafeAreaView>;
}
