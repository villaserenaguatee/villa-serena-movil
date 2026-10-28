import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Action, Loading, Notice } from '../components/cuenta';
import { abrirPasarela } from '../lib/api/checkout';
import {
  cerrarSesion,
  esperarPagoReservaPublica,
  estadoReservaLabel,
  iniciarPagoReservaPublica,
  listarReservas,
  ReservaResumen,
} from '../lib/api/huesped';

export default function Reservations() {
  const [reservas, setReservas] = useState<ReservaResumen[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [pagandoCodigo, setPagandoCodigo] = useState<string | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setBusy(true);
    try { setReservas(await listarReservas()); setError(''); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }, []);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  async function pagarReserva(codigo: string) {
    if (pagandoCodigo) return;
    setPagandoCodigo(codigo);
    setError('');
    try {
      const sesion = await iniciarPagoReservaPublica(codigo);
      await abrirPasarela(sesion.urlPago);
      await esperarPagoReservaPublica(codigo, 8, 2500);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el pago con Recurrente.');
    } finally {
      setPagandoCodigo(null);
    }
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream">
      <ScrollView
        className="flex-1 bg-cream"
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={reload} />}
      >
        <View className="rounded-[28px] border border-line bg-sand p-6">
          <Text className="text-[10px] font-semibold uppercase tracking-[3px] text-gold">Portal del Huésped</Text>
          <Text accessibilityRole="header" className="mt-1 text-2xl font-light text-navy">
            Mis reservas
          </Text>
          <Text className="mt-1 text-xs leading-5 text-muted">
            Selecciona tu reserva para abrir el portal de tu estancia.
          </Text>
        </View>

        {error ? <Notice text={error} /> : null}
        {!reservas && !error ? <Loading label="Cargando reservas…" /> : null}
        {reservas?.length === 0 ? <Notice text="No encontramos reservas asociadas a tu correo." /> : null}

        {reservas?.map(reserva => (
          <View key={reserva.codigo} className="gap-3 rounded-[28px] border border-line bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-semibold text-navy">{reserva.codigo}</Text>
              <View className="rounded-full border border-line bg-sand px-3 py-1">
                <Text className="text-xs font-semibold text-navy">{estadoReservaLabel[reserva.estado]}</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1 rounded-xl border border-line bg-cream p-3">
                <Text className="text-[10px] uppercase tracking-widest text-muted">Entrada</Text>
                <Text className="mt-0.5 text-sm font-semibold text-navy">{reserva.entrada}</Text>
              </View>
              <View className="flex-1 rounded-xl border border-line bg-cream p-3">
                <Text className="text-[10px] uppercase tracking-widest text-muted">Salida</Text>
                <Text className="mt-0.5 text-sm font-semibold text-navy">{reserva.salida}</Text>
              </View>
            </View>
            {reserva.estado === 'PENDIENTE_PAGO' ? (
              <Action
                label={pagandoCodigo === reserva.codigo ? 'Abriendo Recurrente…' : 'Pagar reserva con Recurrente'}
                disabled={pagandoCodigo !== null}
                onPress={() => { void pagarReserva(reserva.codigo); }}
              />
            ) : null}
            <Action
              label="Abrir mi estancia"
              secondary={reserva.estado === 'PENDIENTE_PAGO'}
              onPress={() => router.push({ pathname: '/estadia', params: { codigo: reserva.codigo } })}
            />
          </View>
        ))}

        <Action label="Cerrar sesión" secondary onPress={() => { void cerrarSesion(); }} />
      </ScrollView>
    </SafeAreaView>
  );
}
