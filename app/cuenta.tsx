import { router } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, dateLabel, DemoNotice, money, Notice, useAccount } from '../components/cuenta';
import { balance } from '../lib/mocks/cuenta';
const labels = { APROBADO: 'Aprobado', PENDIENTE: 'Pendiente', FALLIDO: 'Fallido', REEMBOLSADO: 'Reembolsado' };
export default function AccountScreen() {
  const { account, refreshing, error, reload } = useAccount();
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream">
    <ScrollView contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      <DemoNotice />
      {error ? <><Notice text={error} /><Action label="Reintentar" onPress={reload} /></> : null}
      {!account ? <Text className="text-muted">Cargando cuenta…</Text> : <>
        <Text className="text-xs uppercase tracking-widest text-muted">{account.code} · {account.status === 'ABIERTA' ? 'Cuenta abierta' : 'Cuenta cerrada'}</Text>
        <Text accessibilityRole="header" className="mt-2 text-3xl text-navy">Mi cuenta</Text>
        <Text className="mt-2 text-base text-muted">{account.guest} · Habitación {account.room}</Text>
        <View className="my-6 rounded-3xl bg-navy p-6">
          <Text className="text-sm text-white/80">Saldo pendiente</Text>
          <Text className="mt-2 text-4xl font-semibold text-white">{money(balance(account))}</Text>
          <Text className="mt-3 text-xs leading-5 text-white/80">Cargos vigentes menos pagos aprobados. IVA incluido.</Text>
        </View>
        <Text accessibilityRole="header" className="mb-3 text-xl font-semibold text-navy">Cargos</Text>
        <View className="mb-6 rounded-2xl bg-white px-4">
          {account.charges.map(charge => <View key={charge.id} className="border-b border-cream py-4">
            <View className="flex-row justify-between gap-3"><Text className={`flex-1 text-base text-navy ${charge.status === 'ANULADO' ? 'line-through' : ''}`}>{charge.concept}</Text><Text className="font-semibold text-navy">{money(charge.cents)}</Text></View>
            <Text className="mt-2 text-xs text-muted">{dateLabel(charge.date)}</Text>
            {charge.status === 'ANULADO' ? <Text className="mt-2 text-xs font-semibold text-muted">Anulado · No suma al saldo</Text> : null}
          </View>)}
        </View>
        <Text accessibilityRole="header" className="mb-3 text-xl font-semibold text-navy">Pagos</Text>
        <View className="mb-6 rounded-2xl bg-white px-4">
          {account.payments.map(payment => <View key={payment.id} className="border-b border-cream py-4">
            <View className="flex-row justify-between"><Text className="text-base text-navy">{payment.method}</Text><Text className="font-semibold text-navy">{money(payment.cents)}</Text></View>
            <Text className="mt-2 text-xs text-muted">{dateLabel(payment.date)} · {labels[payment.status]}</Text>
          </View>)}
        </View>
        <Action label={account.reservation === 'FINALIZADA' ? 'Ver factura' : 'Continuar al check-out'} onPress={() => router.push(account.reservation === 'FINALIZADA' ? '/factura' : '/checkout')} />
      </>}
    </ScrollView>
  </SafeAreaView>;
}
