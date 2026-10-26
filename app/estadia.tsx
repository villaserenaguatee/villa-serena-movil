import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Action, Notice } from '../components/cuenta';
import { cerrarSesion, detalleReserva, estadoReservaLabel, ReservaDetalle } from '../lib/api/huesped';
export default function StayScreen() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const [stay, setStay] = useState<ReservaDetalle | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (!codigo) return;
    setBusy(true);
    try { setStay(await detalleReserva(codigo)); setError(''); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }, [codigo]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const active = stay?.estado === 'EN_ESTADIA';
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={reload} />}>
    {error ? <Notice text={error} /> : null}
    {stay ? <>
      <Text className="text-xs uppercase tracking-widest text-muted">{stay.codigo}</Text>
      <Text accessibilityRole="header" className="my-4 text-3xl text-navy">Tu estadía</Text>
      <View className="mb-6 gap-4 rounded-3xl bg-white p-6">
        <Text className="text-xl text-navy">{stay.tipoHabitacion.nombre}</Text>
        <Text className="text-base text-muted">Entrada: {stay.entrada}</Text>
        <Text className="text-base text-muted">Salida: {stay.salida} · {stay.horaCheckOut} (Guatemala)</Text>
        <Text className="text-base text-navy">{stay.numeroHuespedes} {stay.numeroHuespedes === 1 ? 'huésped' : 'huéspedes'} · Habitación {stay.habitacion?.numero ?? 'Por asignar'}</Text>
        <Text className="font-semibold text-navy">{estadoReservaLabel[stay.estado]}</Text>
      </View>
    </> : null}
    <View className="gap-4">
      {active ? <>
        <Action label="Mi cuenta y check-out" onPress={() => router.push('/cuenta')} />
        <Action label="Room Service" secondary onPress={() => router.push('/room-service')} />
        <Action label="Mis pedidos" secondary onPress={() => router.push('/pedidos')} />
        <Action label="Limpieza y artículos" secondary onPress={() => router.push('/solicitudes')} />
      </> : stay ? <Notice text={stay.estado === 'FINALIZADA' ? 'La estadía finalizó. Pedidos y solicitudes ya no están disponibles.' : 'Room Service y solicitudes estarán disponibles durante la estadía.'} /> : null}
      <Action label="Ver mis reservas" secondary onPress={() => router.push('/reservas')} />
      <Action label="Cerrar sesión" secondary onPress={() => { void cerrarSesion(); }} />
    </View>
  </ScrollView></SafeAreaView>;
}
