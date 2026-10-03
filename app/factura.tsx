import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, DemoNotice, money, Notice, useAccount } from '../components/cuenta';
import { useState } from 'react';
export default function InvoiceScreen() {
  const { account, error, reload } = useAccount();
  const [pdfError, setPdfError] = useState('');
  const invoice = account?.invoice;
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView contentContainerStyle={{ padding: 24 }}>
    <DemoNotice />
    {error ? <><Notice text={error} /><Action label="Reintentar" onPress={reload} /></> : null}
    {!account ? <Text className="text-muted">Cargando factura…</Text> : !invoice ? <Notice text="La factura estará disponible cuando confirmes el check-out." /> : <>
      <View className="mb-6 h-1 w-12 bg-gold" />
      <Text accessibilityRole="header" className="text-3xl text-navy">Gracias por tu visita.</Text>
      <Text className="mb-8 mt-4 text-base leading-7 text-muted">Tu check-out de prueba está completo. Esperamos verte pronto en Villa Serena.</Text>
      <View className="mb-6 rounded-3xl bg-white p-6">
        <Text className="text-xs uppercase tracking-widest text-muted">Factura de demostración</Text>
        <Text className="mt-3 text-2xl text-navy">{invoice.number}</Text>
        <Text className="mt-5 text-base text-navy">{invoice.buyer}</Text>
        <Text className="mt-2 text-sm text-muted">{invoice.nit === 'CF' ? 'Consumidor Final' : `NIT: ${invoice.nit}`}</Text>
        <Text className="mt-5 text-sm text-muted">Total · IVA incluido</Text>
        <Text className="mt-2 text-2xl font-semibold text-navy">{money(account.charges.filter(c => c.status === 'VIGENTE').reduce((n, c) => n + c.cents, 0))}</Text>
        <Text className="mt-5 text-sm text-muted">Reserva finalizada · Cuenta cerrada</Text>
      </View>
      {pdfError ? <Notice text={pdfError} /> : null}
      <Action label="Abrir factura PDF" disabled={!invoice.pdfUrl} onPress={() => { if (invoice.pdfUrl) void Linking.openURL(invoice.pdfUrl).catch(() => setPdfError('No pudimos abrir el PDF. Intenta nuevamente.')); }} />
      {!invoice.pdfUrl ? <Text className="mt-3 text-xs leading-5 text-muted">El PDF y el envío por correo estarán disponibles al conectar el API de facturación.</Text> : null}
    </>}
  </ScrollView></SafeAreaView>;
}
