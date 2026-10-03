import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Action, Notice } from '../components/cuenta';
import { getStays, isDemoSession, Stay } from '../lib/mocks/estadia';
export default function Reservations() {
  const [stays, setStays] = useState<Stay[]>([]);
  useFocusEffect(useCallback(() => {
    if (!isDemoSession()) { router.replace('/acceso'); return; }
    let mounted = true;
    void getStays().then(values => { if (mounted) setStays(values); });
    return () => { mounted = false; };
  }, []));
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" contentContainerStyle={{ padding: 24 }}>
    <Notice text="Reservas de demostración · Sin conexión al API" />
    <Text accessibilityRole="header" className="mb-6 text-3xl text-navy">Mis reservas</Text>
    {stays.map(stay => <View key={stay.id} className="mb-4 gap-3 rounded-2xl bg-white p-5">
      <Text className="text-xl text-navy">{stay.code}</Text>
      <Text className="text-muted">{stay.arrival} → {stay.departure}</Text>
      <Text className="text-sm text-navy">{stay.status === 'EN_ESTADIA' ? 'En estadía' : stay.status === 'CONFIRMADA' ? 'Confirmada' : 'Finalizada'}</Text>
      <Action label="Ver detalle" secondary onPress={() => router.push({ pathname: '/estadia', params: { id: stay.id } })} />
    </View>)}
  </ScrollView></SafeAreaView>;
}
