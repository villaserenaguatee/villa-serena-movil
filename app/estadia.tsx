import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Action, Notice } from '../components/cuenta';
import { closeDemoSession, isDemoSession, stays } from '../lib/mocks/estadia';
import { getAccount } from '../lib/mocks/cuenta';
export default function StayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stay = stays.find(value => value.id === id);
  const [finished, setFinished] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!isDemoSession()) { router.replace('/acceso'); return; }
    void getAccount().then(account => setFinished(id === 'actual' && account.reservation === 'FINALIZADA'));
  }, [id]));
  if (!stay) return <Notice text="No se encontró esta reserva de prueba." />;
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" contentContainerStyle={{ padding: 24 }}>
    <Notice text="Estadía de demostración · Sin conexión al API" />
    <Text className="text-xs uppercase tracking-widest text-muted">{stay.code}</Text>
    <Text accessibilityRole="header" className="my-4 text-3xl text-navy">Tu estadía</Text>
    <View className="mb-6 gap-4 rounded-3xl bg-white p-6">
      <Text className="text-xl text-navy">{stay.type}</Text>
      <Text className="text-base text-muted">Entrada: {stay.arrival} · 15:00</Text>
      <Text className="text-base text-muted">Salida: {stay.departure} · 12:00 (Guatemala)</Text>
      <Text className="text-base text-navy">{stay.guests} huéspedes · Habitación {stay.room ?? 'Por asignar'}</Text>
      <Text className="font-semibold text-navy">{finished ? 'Finalizada' : stay.status === 'EN_ESTADIA' ? 'En estadía' : 'Confirmada'}</Text>
    </View>
    <View className="gap-4">
      {id === 'actual' ? <Action label={finished ? 'Ver factura' : 'Mi cuenta y check-out'} onPress={() => router.push(finished ? '/factura' : '/cuenta')} /> : null}
      {!finished && stay.status === 'EN_ESTADIA' ? <>
        <Action label="Room Service" secondary onPress={() => router.push('/room-service')} />
        <Action label="Mis pedidos" secondary onPress={() => router.push('/pedidos')} />
        <Action label="Limpieza y artículos" secondary onPress={() => router.push('/solicitudes')} />
      </> : <Notice text={finished ? 'La estadía finalizó. Pedidos y solicitudes ya no están disponibles.' : 'Room Service y solicitudes estarán disponibles durante la estadía.'} />}
      <Action label="Ver mis reservas" secondary onPress={() => router.push('/reservas')} />
      <Action label="Cerrar sesión de prueba" secondary onPress={() => { closeDemoSession(); router.replace('/'); }} />
    </View>
  </ScrollView></SafeAreaView>;
}
