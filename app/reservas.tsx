import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Action, Notice } from '../components/cuenta';
import { estadoReservaLabel, listarReservas, ReservaResumen } from '../lib/api/huesped';
export default function Reservations() {
  const [reservas, setReservas] = useState<ReservaResumen[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setBusy(true);
    try { setReservas(await listarReservas()); setError(''); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={reload} />}>
    <Text accessibilityRole="header" className="mb-6 text-3xl text-navy">Mis reservas</Text>
    {error ? <Notice text={error} /> : null}
    {reservas?.length === 0 ? <Notice text="No encontramos reservas asociadas a tu correo." /> : null}
    {reservas?.map(reserva => <View key={reserva.codigo} className="mb-4 gap-3 rounded-2xl bg-white p-5">
      <Text className="text-xl text-navy">{reserva.codigo}</Text>
      <Text className="text-muted">{reserva.entrada} → {reserva.salida}</Text>
      <Text className="text-sm text-navy">{estadoReservaLabel[reserva.estado]}</Text>
      <Action label="Ver detalle" secondary onPress={() => router.push({ pathname: '/estadia', params: { codigo: reserva.codigo } })} />
    </View>)}
  </ScrollView></SafeAreaView>;
}
