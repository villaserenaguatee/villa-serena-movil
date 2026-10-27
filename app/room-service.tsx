import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Action, money, Notice, useCarga } from '../components/cuenta';
import { ApiError } from '../lib/api';
import { detalleReserva, reservaActual } from '../lib/api/huesped';
import { consultarMenu, crearPedido, totalCarrito } from '../lib/api/pedidos';
export default function RoomService() {
  const { codigo: param } = useLocalSearchParams<{ codigo?: string }>();
  const { data, refreshing, error: loadError, reload } = useCarga(useCallback(async () => {
    const codigo = await reservaActual(param);
    const active = (await detalleReserva(codigo)).estado === 'EN_ESTADIA';
    return { codigo, active, menu: active ? await consultarMenu(codigo) : null };
  }, [param]));
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const menu = data?.menu;
  const total = menu ? totalCarrito(menu, cart) : 0;
  async function submit() {
    if (busy || !data?.active) return;
    setBusy(true); setError('');
    try { await crearPedido(data.codigo, cart, notes); setCart({}); setNotes(''); router.push({ pathname: '/pedidos', params: { codigo: data.codigo } }); }
    catch (cause) {
      // 409: el servidor identifica en detalles los ítems que se agotaron; se recarga el menú.
      const detalles = cause instanceof ApiError ? cause.detalles.map(detalle => detalle.mensaje) : [];
      setError([(cause as Error).message, ...detalles].join('\n'));
      if (cause instanceof ApiError && cause.status === 409) await reload();
    } finally { setBusy(false); }
  }
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
    <Text accessibilityRole="header" className="mb-6 text-3xl text-navy">Room Service</Text>
    {loadError ? <Notice text={loadError} /> : null}
    {data && !data.active ? <Notice text="Room Service está disponible solo durante la estadía." /> : null}
    {menu ? <>
      {menu.categorias.map(category => <View key={category.id} className="mb-6">
        <Text className="mb-3 text-xl font-semibold text-navy">{category.nombre}</Text>
        {menu.items.filter(item => item.categoriaId === category.id).map(item => <View key={item.id} className={`mb-3 gap-3 rounded-2xl bg-white p-5 ${item.disponibilidad === 'AGOTADO' ? 'opacity-60' : ''}`}>
          <Text className="text-lg text-navy">{item.nombre}</Text><Text className="text-sm leading-6 text-muted">{item.descripcion}</Text><Text className="font-semibold text-navy">{money(item.precio)}</Text>
          {item.disponibilidad === 'DISPONIBLE' ? <View className="flex-row items-center gap-3"><View className="flex-1"><Action label="−" accessibilityLabel={`Quitar ${item.nombre}`} secondary disabled={busy || !cart[item.id]} onPress={() => setCart({ ...cart, [item.id]: Math.max(0, (cart[item.id] ?? 0) - 1) })} /></View><Text className="text-navy">{cart[item.id] ?? 0}</Text><View className="flex-1"><Action label="+" accessibilityLabel={`Agregar ${item.nombre}`} secondary disabled={busy} onPress={() => setCart({ ...cart, [item.id]: (cart[item.id] ?? 0) + 1 })} /></View></View> : <Text className="text-sm font-semibold text-muted">Agotado · No disponible</Text>}
        </View>)}
      </View>)}
      <Text className="mb-3 text-xl text-navy">Tu pedido</Text>
      {menu.items.filter(item => (cart[item.id] ?? 0) > 0).map(item => <Text key={item.id} className="mb-2 text-navy">{item.nombre} × {cart[item.id]} · {money(totalCarrito({ ...menu, items: [item] }, cart))}</Text>)}
      <TextInput accessibilityLabel="Notas para el pedido" value={notes} onChangeText={setNotes} maxLength={500} multiline placeholder="Notas (opcional), por ejemplo: sin cebolla" className="my-4 rounded-xl border border-muted/30 bg-white p-4 text-navy" />
      <Text className="mb-4 text-2xl font-semibold text-navy">Total: {money(total)}</Text>
      <Text className="mb-5 text-sm leading-6 text-muted">Se cargará a tu cuenta cuando el pedido sea entregado.</Text>
      {error ? <Notice text={error} /> : null}
      <Action label={busy ? 'Enviando…' : 'Enviar pedido'} disabled={busy || total === 0} onPress={submit} />
    </> : null}
  </ScrollView></SafeAreaView>;
}
