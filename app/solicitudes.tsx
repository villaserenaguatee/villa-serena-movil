import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Action, dateLabel, Notice } from '../components/cuenta';
import { articles, cancelRequest, DemoRequest, getRequests, requestArticles, requestCleaning } from '../lib/mocks/servicios';
import { getAccount } from '../lib/mocks/cuenta';
const labels = { PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', ATENDIDA: 'Atendida', CANCELADA: 'Cancelada' };
export default function Requests() {
  const [requests, setRequests] = useState<DemoRequest[]>([]); const [comment, setComment] = useState(''); const [counts, setCounts] = useState<Record<string, number>>({}); const [busy, setBusy] = useState(false); const [active, setActive] = useState(false); const [error, setError] = useState('');
  const reload = useCallback(async () => { setBusy(true); try { setRequests(await getRequests()); setActive((await getAccount()).reservation === 'EN_ESTADIA'); setError(''); } catch { setError('No pudimos cargar las solicitudes.'); } finally { setBusy(false); } }, []);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  async function run(action: () => Promise<void>) { if (busy) return; setBusy(true); setError(''); try { await action(); setRequests(await getRequests()); setActive((await getAccount()).reservation === 'EN_ESTADIA'); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); } }
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView className="flex-1 bg-cream" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={reload} />}>
    <Notice text="Solicitudes de demostración · No se envían al personal de Limpieza" />
    <Text accessibilityRole="header" className="mb-6 text-3xl text-navy">Limpieza y artículos</Text>
    {error ? <Notice text={error} /> : null}
    {active ? <>
      <View className="mb-6 gap-3 rounded-2xl bg-white p-5"><Text className="text-xl text-navy">Solicitar limpieza</Text><TextInput accessibilityLabel="Comentario de limpieza" value={comment} onChangeText={setComment} multiline placeholder="Comentario (opcional)" className="rounded-xl border border-muted/30 p-4 text-navy" /><Action label="Pedir limpieza" disabled={busy} onPress={() => run(async () => { await requestCleaning(comment); setComment(''); })} /></View>
      <Text className="mb-3 text-xl text-navy">Artículos para tu habitación</Text>
      {articles.map(item => <View key={item.id} className="mb-3 gap-3 rounded-2xl bg-white p-5"><Text className="text-lg text-navy">{item.name} · Máximo {item.max}</Text><View className="flex-row items-center gap-3"><View className="flex-1"><Action label="−" accessibilityLabel={`Quitar ${item.name}`} secondary disabled={!counts[item.id] || busy} onPress={() => setCounts({ ...counts, [item.id]: Math.max(0, (counts[item.id] ?? 0) - 1) })} /></View><Text className="text-navy">{counts[item.id] ?? 0}</Text><View className="flex-1"><Action label="+" accessibilityLabel={`Agregar ${item.name}`} secondary disabled={counts[item.id] >= item.max || busy} onPress={() => setCounts({ ...counts, [item.id]: (counts[item.id] ?? 0) + 1 })} /></View></View></View>)}
      <Action label="Pedir artículos" disabled={busy || !Object.values(counts).some(count => count > 0)} onPress={() => run(async () => { await requestArticles(counts); setCounts({}); })} />
    </> : <Notice text="Estos servicios están disponibles solo durante la estadía." />}
    <Text accessibilityRole="header" className="my-6 text-xl text-navy">Mis solicitudes</Text>
    {!requests.length ? <Text className="text-muted">Todavía no tienes solicitudes.</Text> : null}
    {requests.map(request => <View key={request.id} className="mb-4 gap-3 rounded-2xl bg-white p-5"><Text className="font-semibold text-navy">{request.type === 'LIMPIEZA' ? 'Limpieza' : 'Artículos'} · {labels[request.status]}</Text><Text className="text-muted">{dateLabel(request.date)}</Text><Text className="text-navy">{request.description}</Text>{request.comment ? <Text className="text-muted">{request.comment}</Text> : null}{request.status === 'PENDIENTE' ? <Action label="Cancelar solicitud" secondary disabled={busy} onPress={() => run(() => cancelRequest(request.id))} /> : <Text className="text-xs text-muted">Solo se pueden cancelar solicitudes pendientes.</Text>}</View>)}
  </ScrollView></SafeAreaView>;
}
