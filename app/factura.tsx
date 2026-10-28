import { Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Action, dateLabel, Loading, money, Notice, useCarga } from '../components/cuenta';
import { consultarFactura, enlaceFacturaPdf } from '../lib/api/checkout';
import { reservaActual } from '../lib/api/huesped';
export default function InvoiceScreen() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const { data: invoice, refreshing, error, reload } = useCarga(useCallback(async () => consultarFactura(await reservaActual(codigo)), [codigo]));
  const [pdfError, setPdfError] = useState('');
  const [opening, setOpening] = useState(false);
  async function openPdf(id: number) {
    if (opening) return;
    setOpening(true); setPdfError('');
    try { await Linking.openURL((await enlaceFacturaPdf(id)).url); }
    catch (cause) { setPdfError(cause instanceof Error ? cause.message : 'No pudimos abrir el PDF. Intenta nuevamente.'); }
    finally { setOpening(false); }
  }
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
    {error ? <><Notice text={error} /><Action label="Reintentar" onPress={reload} /></> : null}
    {!invoice && !error ? <Loading label="Cargando factura…" /> : null}
    {invoice ? <>
      <View className="mb-6 h-1 w-12 bg-gold" />
      <Text accessibilityRole="header" className="text-3xl text-navy">Gracias por tu visita.</Text>
      <Text className="mb-8 mt-4 text-base leading-7 text-muted">Tu check-out está completo. Esperamos verte pronto en Villa Serena.</Text>
      <View className="mb-6 rounded-3xl bg-white p-6">
        <Text className="text-xs uppercase tracking-widest text-muted">Factura · Serie {invoice.serie}</Text>
        <Text className="mt-3 text-2xl text-navy">No. {invoice.numero}</Text>
        <Text className="mt-1 text-sm text-muted">{dateLabel(invoice.emitidaEn)} · {invoice.codigoReserva}</Text>
        <Text className="mt-5 text-base text-navy">{invoice.comprador.nombreComprador}</Text>
        <Text className="mt-2 text-sm text-muted">{invoice.comprador.nit === 'CF' ? 'Consumidor Final' : `NIT: ${invoice.comprador.nit}`}</Text>
        <View className="mt-5 gap-2">{invoice.cargos.map((cargo, index) => <View key={index} className="flex-row justify-between gap-3"><Text className="flex-1 text-sm text-navy">{cargo.concepto}{cargo.cantidad !== 1 ? ` × ${cargo.cantidad}` : ''}</Text><Text className="text-sm text-navy">{money(cargo.monto)}</Text></View>)}</View>
        <Text className="mt-5 text-sm text-muted">Total · {invoice.leyendaIva}</Text>
        <Text className="mt-2 text-2xl font-semibold text-navy">{money(invoice.total)}</Text>
        <Text className="mt-5 text-xs text-muted">{invoice.leyendaLegal}</Text>
      </View>
      {pdfError ? <Notice text={pdfError} /> : null}
      <Action label={opening ? 'Abriendo…' : 'Abrir factura PDF'} disabled={opening} onPress={() => { void openPdf(invoice.id); }} />
      <View className="mt-3"><Action label="Ver mis reservas" secondary onPress={() => router.replace('/reservas')} /></View>
    </> : null}
  </ScrollView></SafeAreaView>;
}
