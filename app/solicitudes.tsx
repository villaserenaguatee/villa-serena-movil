import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Action, dateLabel, Loading, Notice, useCarga } from '../components/cuenta';
import { detalleReserva, reservaActual } from '../lib/api/huesped';
import { cancelarSolicitud, describirSolicitud, estadoSolicitudLabel, listarArticulos, listarSolicitudes, solicitarArticulos, solicitarLimpieza } from '../lib/api/solicitudes';
export default function Requests() {
  const { codigo: param } = useLocalSearchParams<{ codigo?: string }>();
  const { data, refreshing, error: loadError, reload } = useCarga(useCallback(async () => {
    const codigo = await reservaActual(param);
    const [reserva, solicitudes, articulos] = await Promise.all([
      detalleReserva(codigo),
      listarSolicitudes(codigo).catch(() => []),
      listarArticulos(codigo).catch(() => []),
    ]);
    const active = reserva.estado === 'EN_ESTADIA';
    return { codigo, active, solicitudes, articulos };
  }, [param]));
  const [comment, setComment] = useState('');
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function run(action: (codigo: string) => Promise<void>, done: string) {
    if (busy || !data) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(data.codigo); setMessage(done); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); await reload(); }
  }
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}><ScrollView className="flex-1 bg-cream" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 24, paddingBottom: 140 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
    <Text accessibilityRole="header" className="mb-6 text-3xl text-navy">Limpieza y artículos</Text>
    {loadError ? <Notice text={loadError} /> : null}
    {!data && !loadError ? <Loading label="Cargando solicitudes…" /> : null}
    {error ? <Notice text={error} /> : null}
    {message ? <Notice text={message} /> : null}
    {data?.active ? <>
      <View className="mb-6 gap-3 rounded-2xl bg-white p-5"><Text className="text-xl text-navy">Solicitar limpieza</Text><TextInput accessibilityLabel="Comentario de limpieza" value={comment} onChangeText={setComment} maxLength={500} multiline placeholder="Comentario (opcional), por ejemplo: después de las 2:00 p. m." className="rounded-xl border border-muted/30 p-4 text-navy" /><Action label={busy ? 'Enviando…' : 'Pedir limpieza'} disabled={busy} onPress={() => run(async codigo => { await solicitarLimpieza(codigo, comment); setComment(''); }, 'Solicitud de limpieza enviada.')} /></View>
      <Text className="mb-3 text-xl text-navy">Artículos para tu habitación</Text>
      {data.articulos.map(item => <View key={item.id} className="mb-3 gap-3 rounded-2xl bg-white p-5"><Text className="text-lg text-navy">{item.nombre} · Máximo {item.cantidadMaxima}</Text><View className="flex-row items-center gap-3"><View className="flex-1"><Action label="−" accessibilityLabel={`Quitar ${item.nombre}`} secondary disabled={!counts[item.id] || busy} onPress={() => setCounts({ ...counts, [item.id]: Math.max(0, (counts[item.id] ?? 0) - 1) })} /></View><Text className="text-navy">{counts[item.id] ?? 0}</Text><View className="flex-1"><Action label="+" accessibilityLabel={`Agregar ${item.nombre}`} secondary disabled={(counts[item.id] ?? 0) >= item.cantidadMaxima || busy} onPress={() => setCounts({ ...counts, [item.id]: (counts[item.id] ?? 0) + 1 })} /></View></View></View>)}
      <Action label={busy ? 'Enviando…' : 'Pedir artículos'} disabled={busy || !Object.values(counts).some(count => count > 0)} onPress={() => run(async codigo => { await solicitarArticulos(codigo, counts); setCounts({}); }, 'Solicitud de artículos enviada.')} />
    </> : data ? <Notice text="Estos servicios están disponibles solo durante la estadía." /> : null}
    <Text accessibilityRole="header" className="my-6 text-xl text-navy">Mis solicitudes</Text>
    {data && !data.solicitudes.length ? <Text className="text-muted">Todavía no tienes solicitudes.</Text> : null}
    {data?.solicitudes.map(request => <View key={request.id} className="mb-4 gap-3 rounded-2xl bg-white p-5"><Text className="font-semibold text-navy">{request.tipo === 'LIMPIEZA' ? 'Limpieza' : 'Artículos'} · {estadoSolicitudLabel[request.estado]}</Text><Text className="text-muted">{dateLabel(request.creadaEn)}</Text><Text className="text-navy">{describirSolicitud(request)}</Text>{request.comentario ? <Text className="text-muted">{request.comentario}</Text> : null}{request.estado === 'PENDIENTE' ? <Action label="Cancelar solicitud" secondary disabled={busy} onPress={() => run(codigo => cancelarSolicitud(codigo, request.id).then(() => undefined), 'Solicitud cancelada.')} /> : request.estado === 'EN_PROCESO' ? <Text className="text-xs text-muted">El personal ya está atendiendo esta solicitud; no se puede cancelar.</Text> : null}</View>)}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
