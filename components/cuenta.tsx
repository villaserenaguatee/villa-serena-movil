import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
// Montos del contrato: quetzales con dos decimales, IVA incluido.
export const money = (quetzales: number) => `Q ${quetzales.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dateLabel = (value: string) => new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
// Carga al enfocar la pantalla y con deslizar hacia abajo; conserva el último dato si falla.
export function useCarga<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setRefreshing(true);
    try { setData(await load()); setError(''); }
    catch (cause) { setError((cause as Error).message); }
    finally { setRefreshing(false); }
  }, [load]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return { data, setData, refreshing, error, reload };
}
export function Action({ label, onPress, disabled = false, secondary = false, loading, accessibilityLabel }: { accessibilityLabel?: string; label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; loading?: boolean }) {
  const spinning = loading ?? label.endsWith('…');
  return <Pressable accessibilityLabel={accessibilityLabel ?? label} accessibilityRole="button" accessibilityState={{ disabled, busy: spinning }} disabled={disabled} onPress={onPress} className={`flex-row items-center justify-center gap-3 rounded-2xl px-5 py-4 ${secondary ? 'border border-navy bg-white' : 'bg-navy'} ${disabled ? 'opacity-40' : 'active:opacity-80'}`}>
    {spinning ? <ActivityIndicator size="small" color={secondary ? '#0d2d52' : '#ffffff'} /> : null}
    <Text className={`text-center text-base font-semibold ${secondary ? 'text-navy' : 'text-white'}`}>{label}</Text>
  </Pressable>;
}
export function Notice({ text }: { text: string }) {
  return <View accessibilityRole="alert" className="mb-4 rounded-xl border-l-4 border-gold bg-white p-4">
    <Text className="text-sm leading-6 text-navy">{text}</Text>
  </View>;
}
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return <View accessibilityLabel={label} className="items-center justify-center py-12">
    <ActivityIndicator size="large" color="#0d2d52" />
    <Text className="mt-3 text-sm text-muted">{label}</Text>
  </View>;
}
