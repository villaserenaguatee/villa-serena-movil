import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Loading, money, Notice, useCarga } from '../components/cuenta';
import { abrirPasarela, confirmarCheckout, consultarCheckout, consultarPagoSaldo, esperarAcreditacion, iniciarPagoSaldo } from '../lib/api/checkout';
import { reservaActual } from '../lib/api/huesped';
import { olvidarDispositivo } from '../lib/api/push';
import { normalizarNit, validarNit } from '../lib/nit';
export default function CheckoutScreen() {
  const { codigo: param } = useLocalSearchParams<{ codigo?: string }>();
  const { data, refreshing, error: loadError, reload } = useCarga(useCallback(async () => {
    const codigo = await reservaActual(param);
    const [vista, proceso] = await Promise.all([consultarCheckout(codigo), consultarPagoSaldo(codigo)]);
    return { codigo, vista, proceso };
  }, [param]));
  const [buyer, setBuyer] = useState<string | null>(null);
  const [consumer, setConsumer] = useState(true);
  const [nit, setNit] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const vista = data?.vista;
  const proceso = data?.proceso;
  const pending = (vista?.pedidosACancelar.length ?? 0) > 0;
  const accepted = !pending || consent;
  const saldo = vista?.saldo ?? 0;
  const buyerName = buyer ?? vista?.nombreCompradorSugerido ?? '';
  const nitError = !consumer && nit.length > 0 && !validarNit(nit) ? 'NIT inválido. Revisa el número y su dígito verificador (puede ser K).' : '';
  async function run(action: (codigo: string) => Promise<unknown>, recargar = true) {
    if (busy || !data) return;
    setBusy(true); setError('');
    try { await action(data.codigo); }
    catch (cause) { recargar = true; setError(cause instanceof Error ? cause.message : 'No pudimos completar la operación. Intenta nuevamente.'); }
    finally { setBusy(false); if (recargar) await reload(); }
  }
  const pay = (url?: string | null) => run(async codigo => {
    const pago = url ? { urlPago: url } : await iniciarPagoSaldo(codigo);
    if (!pago) return;
    await abrirPasarela(pago.urlPago);
    await esperarAcreditacion(codigo);
  });
  const confirm = () => run(async codigo => {
    await confirmarCheckout(codigo, { nit: consumer ? 'CF' : normalizarNit(nit), nombreComprador: buyerName.trim() }, consent);
    await olvidarDispositivo().catch(() => undefined);
    router.replace({ pathname: '/factura', params: { codigo } });
  }, false);
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      <Text accessibilityRole="header" className="text-3xl text-navy">Antes de despedirnos</Text>
      <Text className="mb-6 mt-3 text-base leading-6 text-muted">Revisa tu saldo y los datos de tu factura. El check-out en la app está disponible el día de salida, de 00:00 a 12:00 (Guatemala).</Text>
      {loadError ? <><Notice text={loadError} /><Action label="Reintentar" onPress={reload} /></> : null}
      {!data && !loadError ? <Loading label="Cargando datos de check-out…" /> : null}
      {vista?.motivosBloqueo.map(motivo => <Notice key={motivo} text={motivo} />)}
      {vista?.pedidoEnCamino ? <Notice text="Tienes un pedido en camino. Espera su entrega para continuar." /> : null}
      {error ? <Notice text={error} /> : null}
      {vista && proceso ? <>
        <View className="mb-6 rounded-2xl bg-white p-5"><Text className="text-sm text-muted">{saldo < 0 ? 'Saldo a tu favor' : 'Saldo pendiente'}</Text><Text className="mt-2 text-3xl font-semibold text-navy">{money(Math.abs(saldo))}</Text></View>
        {pending ? <View className="mb-6 rounded-2xl border border-gold bg-white p-4">
          <Text className="text-sm leading-6 text-navy">Tienes {vista.pedidosACancelar.length === 1 ? 'un pedido nuevo o en preparación' : `${vista.pedidosACancelar.length} pedidos nuevos o en preparación`}. Se cancelarán sin cargo al confirmar el check-out.</Text>
          <View className="mt-3 flex-row items-center gap-3"><Switch accessibilityLabel="Acepto cancelar mis pedidos pendientes" value={consent} onValueChange={setConsent} trackColor={{ true: '#0d2d52' }} /><Text className="flex-1 text-sm text-navy">Acepto la cancelación</Text></View>
        </View> : null}
        {saldo > 0 ? <View className="mb-6 gap-3">
          {proceso.accionPago === 'INICIAR' || proceso.accionPago === 'REINTENTAR' ? <Action label={busy ? 'Abriendo pago…' : `${proceso.accionPago === 'REINTENTAR' ? 'Reintentar pago' : 'Pagar saldo'} · ${money(saldo)}`} disabled={busy || !accepted || vista.pedidoEnCamino} onPress={() => pay()} /> : null}
          {proceso.accionPago === 'CONTINUAR' ? <Action label="Continuar pago" disabled={busy || !accepted} onPress={() => pay(proceso.urlPago)} /> : null}
          {proceso.accionPago === 'ESPERAR' ? <><Notice text="Estamos verificando tu pago con la pasarela. No vuelvas a pagar." /><Action label="Actualizar estado" secondary disabled={busy} onPress={reload} /></> : null}
          {proceso.accionPago === 'NINGUNA' && proceso.estadoCheckout === 'NO_VERIFICADO' ? <Notice text="No pudimos verificar el pago con la pasarela. Acércate a Recepción." /> : null}
          <Text className="text-xs leading-5 text-muted">El pago se realiza en la página segura de Recurrente, en quetzales. El saldo se actualiza cuando el hotel confirma el pago.</Text>
        </View> : saldo === 0 ? <Notice text="Tu saldo está en Q 0.00. Puedes confirmar sin otro pago." /> : <Notice text="Tienes saldo a favor. Acércate a Recepción para completar tu salida." />}
        <Text accessibilityRole="header" className="mb-4 text-xl font-semibold text-navy">Datos de facturación</Text>
        <View className="mb-6 rounded-2xl bg-white p-5">
          <View className="mb-4 flex-row items-center justify-between"><Text className="text-base text-navy">Consumidor Final</Text><Switch accessibilityLabel="Consumidor Final" value={consumer} onValueChange={setConsumer} trackColor={{ true: '#0d2d52' }} /></View>
          {!consumer ? <><Text className="mb-2 text-sm text-muted">NIT</Text><TextInput accessibilityLabel="NIT" autoCapitalize="characters" autoCorrect={false} value={nit} onChangeText={setNit} placeholder="Ej. 1234567-9" className="mb-3 rounded-xl border border-muted/30 p-4 text-base text-navy" />{nitError ? <Text accessibilityRole="alert" className="mb-4 text-sm text-red-700">{nitError}</Text> : null}</> : null}
          <Text className="mb-2 text-sm text-muted">Nombre del comprador</Text>
          <TextInput accessibilityLabel="Nombre del comprador" value={buyerName} onChangeText={setBuyer} autoCapitalize="words" className="rounded-xl border border-muted/30 p-4 text-base text-navy" />
        </View>
        <Action label={busy ? 'Procesando…' : 'Confirmar check-out'} disabled={busy || !vista.puedeConfirmar || saldo !== 0 || !accepted || !buyerName.trim() || (!consumer && !validarNit(nit))} onPress={confirm} />
      </> : null}
      <Pressable accessibilityRole="button" onPress={() => router.back()} className="mt-5 py-3"><Text className="text-center text-sm text-navy">Volver a mi cuenta</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
