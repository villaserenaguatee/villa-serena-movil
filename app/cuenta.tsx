import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, dateLabel, Loading, money, Notice, useCarga } from '../components/cuenta';
import { abrirPasarela, esperarAcreditacion, iniciarPagoSaldo } from '../lib/api/checkout';
import { consultarCuenta, estadoPagoLabel, metodoPagoLabel } from '../lib/api/cuenta';
import { esperarPagoReservaPublica, iniciarPagoReservaPublica, reservaActual } from '../lib/api/huesped';
export default function AccountScreen() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const { data: account, refreshing, error, reload } = useCarga(useCallback(async () => consultarCuenta(await reservaActual(codigo)), [codigo]));
  const [pagando, setPagando] = useState(false);
  const [avisoPago, setAvisoPago] = useState<string | null>(null);

  async function pagarDesdeCuenta() {
    if (!account || pagando) return;
    setPagando(true);
    setAvisoPago(null);
    try {
      if (account.estadoReserva === 'PENDIENTE_PAGO') {
        const sesion = await iniciarPagoReservaPublica(account.codigoReserva);
        await abrirPasarela(sesion.urlPago);
        const est = await esperarPagoReservaPublica(account.codigoReserva, 8, 2500);
        setAvisoPago(
          est.estadoReserva === 'CONFIRMADA'
            ? '¡Pago aprobado! Tu reserva ya está confirmada.'
            : 'Estamos verificando tu pago con Recurrente. Actualiza tu cuenta en unos segundos.',
        );
      } else if (account.estadoReserva === 'EN_ESTADIA') {
        const sesion = await iniciarPagoSaldo(account.codigoReserva);
        if (sesion?.urlPago) {
          await abrirPasarela(sesion.urlPago);
          await esperarAcreditacion(account.codigoReserva, 8, 2500);
          setAvisoPago('Pago procesado con Recurrente.');
        }
      }
      await reload();
    } catch (e) {
      setAvisoPago(e instanceof Error ? e.message : 'No se pudo iniciar el pago con Recurrente.');
    } finally {
      setPagando(false);
    }
  }

  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream">
    <ScrollView contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      {error ? <><Notice text={error} /><Action label="Reintentar" onPress={reload} /></> : null}
      {avisoPago ? <Notice text={avisoPago} /> : null}
      {!account ? (error ? null : <Loading label="Cargando cuenta…" />) : <>
        <Text className="text-xs uppercase tracking-widest text-muted">{account.codigoReserva} · {account.estadoCuenta === 'ABIERTA' ? 'Cuenta abierta' : 'Cuenta cerrada'}</Text>
        <Text accessibilityRole="header" className="mt-2 text-3xl text-navy">Mi cuenta</Text>
        <Text className="mt-2 text-base text-muted">{account.nombreHuesped}</Text>
        <View className="my-6 rounded-3xl bg-navy p-6">
          <Text className="text-sm text-white/80">{account.saldo < 0 ? 'Saldo a tu favor' : 'Saldo pendiente'}</Text>
          <Text className="mt-2 text-4xl font-semibold text-white">{money(Math.abs(account.saldo))}</Text>
          <Text className="mt-3 text-xs leading-5 text-white/80">Cargos vigentes {money(account.totalCargosVigentes)} menos pagos aprobados {money(account.totalPagosAprobados)}. IVA incluido.</Text>
        </View>
        {account.saldo > 0 && (account.estadoReserva === 'PENDIENTE_PAGO' || account.estadoReserva === 'EN_ESTADIA') ? (
          <View className="mb-6 gap-2 rounded-2xl border border-gold bg-sand p-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-gold">Pasarela segura · Recurrente</Text>
            <Text className="text-xs text-muted">
              {account.estadoReserva === 'PENDIENTE_PAGO'
                ? 'Paga tu reserva ahora para confirmarla al instante (prueba: 4242 4242 4242 4242).'
                : 'Paga tu saldo pendiente directamente en línea.'}
            </Text>
            <Action
              label={pagando ? 'Abriendo Recurrente…' : `Pagar con Recurrente · ${money(account.saldo)}`}
              disabled={pagando}
              onPress={() => { void pagarDesdeCuenta(); }}
            />
          </View>
        ) : null}
        <Text accessibilityRole="header" className="mb-3 text-xl font-semibold text-navy">Cargos</Text>
        <View className="mb-6 rounded-2xl bg-white px-4">
          {!account.cargos.length ? <Text className="py-4 text-muted">Todavía no hay cargos.</Text> : null}
          {account.cargos.map(charge => <View key={charge.id} className="border-b border-cream py-4">
            <View className="flex-row justify-between gap-3"><Text className={`flex-1 text-base text-navy ${charge.estado === 'ANULADO' ? 'line-through' : ''}`}>{charge.concepto}</Text><Text className={`font-semibold text-navy ${charge.estado === 'ANULADO' ? 'line-through' : ''}`}>{money(charge.monto)}</Text></View>
            <Text className="mt-2 text-xs text-muted">{dateLabel(charge.fechaHora)}{charge.cantidad !== 1 ? ` · ${charge.cantidad} × ${money(charge.precioUnitario)}` : ''}</Text>
            {charge.estado === 'ANULADO' ? <Text className="mt-2 text-xs font-semibold text-muted">Anulado · No suma al saldo{charge.motivoAnulacion ? ` · ${charge.motivoAnulacion}` : ''}</Text> : null}
          </View>)}
        </View>
        <Text accessibilityRole="header" className="mb-3 text-xl font-semibold text-navy">Pagos</Text>
        <View className="mb-6 rounded-2xl bg-white px-4">
          {!account.pagos.length ? <Text className="py-4 text-muted">Todavía no hay pagos.</Text> : null}
          {account.pagos.map(payment => <View key={payment.id} className="border-b border-cream py-4">
            <View className="flex-row justify-between"><Text className="text-base text-navy">{metodoPagoLabel[payment.metodo]}</Text><Text className="font-semibold text-navy">{money(payment.monto)}</Text></View>
            <Text className="mt-2 text-xs text-muted">{dateLabel(payment.fechaHora)} · {estadoPagoLabel[payment.estado]}{payment.estado === 'APROBADO' ? '' : ' · No resta del saldo'}</Text>
          </View>)}
        </View>
        {account.estadoReserva === 'EN_ESTADIA' ? <Action label="Continuar al check-out" onPress={() => router.push({ pathname: '/checkout', params: { codigo: account.codigoReserva } })} /> : null}
        {account.facturaId ? <Action label="Ver factura" onPress={() => router.push({ pathname: '/factura', params: { codigo: account.codigoReserva } })} /> : null}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
