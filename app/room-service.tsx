import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Action, money, Notice } from '../components/cuenta';
import { getAccount } from '../lib/mocks/cuenta';
import { menu, placeOrder } from '../lib/mocks/servicios';
export default function RoomService() {
  const [active, setActive] = useState(false);
  useFocusEffect(useCallback(() => {
    let mounted = true;
    void getAccount().then(account => { if (mounted) setActive(account.reservation === 'EN_ESTADIA'); });
    return () => { mounted = false; };
  }, []));
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const total = menu.reduce((sum, item) => sum + item.cents * (cart[item.id] ?? 0), 0);
  async function submit() { if (busy || !active) return; setBusy(true); setError(''); try { await placeOrder(cart, notes); setCart({}); setNotes(''); router.push('/pedidos'); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); } }
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
    <Notice text="Menú y pedidos de demostración · No se envían a cocina" />
    {!active ? <Notice text="Room Service está disponible solo durante la estadía." /> : null}
    <Text accessibilityRole="header" className="mb-6 text-3xl text-navy">Room Service</Text>
    {[...new Set(menu.map(item => item.category))].map(category => <View key={category} className="mb-6">
      <Text className="mb-3 text-xl font-semibold text-navy">{category}</Text>
      {menu.filter(item => item.category === category).map(item => <View key={item.id} className="mb-3 gap-3 rounded-2xl bg-white p-5">
        <Text className="text-lg text-navy">{item.name}</Text><Text className="text-sm leading-6 text-muted">{item.description}</Text><Text className="font-semibold text-navy">{money(item.cents)}</Text>
        {item.available ? <View className="flex-row items-center gap-3"><View className="flex-1"><Action label="−" accessibilityLabel={`Quitar ${item.name}`} secondary disabled={!active || busy || !cart[item.id]} onPress={() => setCart({ ...cart, [item.id]: Math.max(0, (cart[item.id] ?? 0) - 1) })} /></View><Text className="text-navy">{cart[item.id] ?? 0}</Text><View className="flex-1"><Action label="+" accessibilityLabel={`Agregar ${item.name}`} secondary disabled={!active || busy} onPress={() => setCart({ ...cart, [item.id]: (cart[item.id] ?? 0) + 1 })} /></View></View> : <Text className="text-sm font-semibold text-muted">Agotado · No disponible</Text>}
      </View>)}
    </View>)}
    <Text className="mb-3 text-xl text-navy">Tu pedido</Text>
    {menu.filter(item => cart[item.id] > 0).map(item => <Text key={item.id} className="mb-2 text-navy">{item.name} × {cart[item.id]} · {money(item.cents * cart[item.id])}</Text>)}
    <TextInput accessibilityLabel="Notas para el pedido" value={notes} onChangeText={setNotes} multiline placeholder="Notas (opcional)" className="my-4 rounded-xl border border-muted/30 bg-white p-4 text-navy" />
    <Text className="mb-4 text-2xl font-semibold text-navy">Total: {money(total)}</Text>
    <Text className="mb-5 text-sm leading-6 text-muted">Se cargará a tu cuenta cuando el pedido sea entregado.</Text>
    {error ? <Notice text={error} /> : null}
    <Action label={busy ? 'Enviando…' : 'Enviar pedido de prueba'} disabled={!active || busy || total === 0} onPress={submit} />
  </ScrollView></SafeAreaView>;
}
