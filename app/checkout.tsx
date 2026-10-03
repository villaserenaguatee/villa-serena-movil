import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, DemoNotice, money, Notice, useAccount } from '../components/cuenta';
import { approveMockPayment, balance, checkoutBlock, confirmMockCheckout, DEMO_NOW, hasPendingOrders, startMockPayment, validNit } from '../lib/mocks/cuenta';
export default function CheckoutScreen() {
  const { account, refreshing, error: loadError, reload } = useAccount();
  const [buyer, setBuyer] = useState<string | null>(null);
  const [consumer, setConsumer] = useState(true);
  const [nit, setNit] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const block = account ? checkoutBlock(account, new Date(DEMO_NOW)) : null;
  const pending = account ? hasPendingOrders(account) : false;
  const accepted = !pending || consent;
  const total = account ? balance(account) : 0;
  const paymentPending = account?.payments.some(p => p.id === 'p-demo' && p.status === 'PENDIENTE');
  const buyerName = buyer ?? account?.guest ?? '';
  const nitError = !consumer && nit.length > 0 && !validNit(nit) ? 'NIT inválido. Revisa el número y su dígito verificador (puede ser K).' : '';
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos completar la operación. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      <DemoNotice />
      <Text accessibilityRole="header" className="text-3xl text-navy">Antes de despedirnos</Text>
      <Text className="mb-6 mt-3 text-base leading-6 text-muted">Revisa tu saldo y los datos de tu factura.</Text>
      {loadError ? <><Notice text={loadError} /><Action label="Reintentar" onPress={reload} /></> : null}
      {block ? <Notice text={block} /> : null}
      {error ? <Notice text={error} /> : null}
      {account && !block ? <>
        <View className="mb-6 rounded-2xl bg-white p-5"><Text className="text-sm text-muted">Saldo pendiente</Text><Text className="mt-2 text-3xl font-semibold text-navy">{money(total)}</Text></View>
        {pending ? <View className="mb-6 rounded-2xl border border-gold bg-white p-4">
          <Text className="text-sm leading-6 text-navy">Tus pedidos nuevos o en preparación se cancelarán sin cargo al confirmar el check-out.</Text>
          <View className="mt-3 flex-row items-center gap-3"><Switch accessibilityLabel="Acepto cancelar mis pedidos pendientes" value={consent} onValueChange={setConsent} trackColor={{ true: '#0d2d52' }} /><Text className="flex-1 text-sm text-navy">Acepto la cancelación</Text></View>
        </View> : null}
        {total > 0 ? <View className="mb-6 gap-3">
          {paymentPending ? <>
            <Notice text="Pago de prueba pendiente. El saldo se conserva hasta simular la confirmación del pago." />
            <Action label="Simular confirmación del pago" disabled={busy || !accepted} onPress={() => run(approveMockPayment)} />
          </> : <Action label="Pagar saldo · Simulación" disabled={busy || !accepted} onPress={() => run(startMockPayment)} />}
          <Text className="text-xs leading-5 text-muted">Esta vista no abre Stripe ni procesa tarjetas. La integración real confirmará el pago mediante el webhook del servidor.</Text>
        </View> : <Notice text="Tu saldo está en Q 0.00. Puedes confirmar sin otro pago." />}
        <Text accessibilityRole="header" className="mb-4 text-xl font-semibold text-navy">Datos de facturación</Text>
        <View className="mb-6 rounded-2xl bg-white p-5">
          <View className="mb-4 flex-row items-center justify-between"><Text className="text-base text-navy">Consumidor Final</Text><Switch accessibilityLabel="Consumidor Final" value={consumer} onValueChange={setConsumer} trackColor={{ true: '#0d2d52' }} /></View>
          {!consumer ? <><Text className="mb-2 text-sm text-muted">NIT</Text><TextInput accessibilityLabel="NIT" autoCapitalize="characters" autoCorrect={false} value={nit} onChangeText={setNit} placeholder="Ej. 1234567-9" className="mb-3 rounded-xl border border-muted/30 p-4 text-base text-navy" />{nitError ? <Text accessibilityRole="alert" className="mb-4 text-sm text-red-700">{nitError}</Text> : null}</> : null}
          <Text className="mb-2 text-sm text-muted">Nombre del comprador</Text>
          <TextInput accessibilityLabel="Nombre del comprador" value={buyerName} onChangeText={setBuyer} autoCapitalize="words" className="rounded-xl border border-muted/30 p-4 text-base text-navy" />
        </View>
        <Action label={busy ? 'Procesando…' : 'Confirmar check-out'} disabled={busy || total !== 0 || !accepted || !buyerName.trim() || (!consumer && !validNit(nit))} onPress={() => run(async () => { await confirmMockCheckout(buyerName, consumer ? 'CF' : nit.trim().toUpperCase(), consent); router.replace('/factura'); })} />
      </> : null}
      <Pressable accessibilityRole="button" onPress={() => router.back()} className="mt-5 py-3"><Text className="text-center text-sm text-navy">Volver a mi cuenta</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
