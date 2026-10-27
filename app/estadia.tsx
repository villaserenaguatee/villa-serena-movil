import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Action, Notice, useCarga } from '../components/cuenta';
import { cerrarSesion, detalleReserva, estadoReservaLabel, reservaActual } from '../lib/api/huesped';
export default function StayScreen() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const { data: stay, refreshing, error, reload } = useCarga(useCallback(async () => detalleReserva(await reservaActual(codigo)), [codigo]));
  const active = stay?.estado === 'EN_ESTADIA';
  const go = (pathname: '/cuenta' | '/room-service' | '/pedidos' | '/solicitudes') => { if (stay) router.push({ pathname, params: { codigo: stay.codigo } }); };
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
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
      {stay ? <Action label={active ? 'Mi cuenta y check-out' : 'Mi cuenta'} onPress={() => go('/cuenta')} /> : null}
      {active ? <>
        <Action label="Room Service" secondary onPress={() => go('/room-service')} />
        <Action label="Mis pedidos" secondary onPress={() => go('/pedidos')} />
        <Action label="Limpieza y artículos" secondary onPress={() => go('/solicitudes')} />
      </> : stay ? <Notice text={stay.estado === 'FINALIZADA' ? 'La estadía finalizó. Pedidos y solicitudes ya no están disponibles.' : 'Room Service y solicitudes estarán disponibles durante la estadía.'} /> : null}
      <Action label="Ver mis reservas" secondary onPress={() => router.push('/reservas')} />
      <Action label="Cerrar sesión" secondary onPress={() => { void cerrarSesion(); }} />
    </View>
  </ScrollView></SafeAreaView>;
}
