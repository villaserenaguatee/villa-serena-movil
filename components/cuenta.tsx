import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Account, getAccount } from '../lib/mocks/cuenta';
export const money = (cents: number) => `Q ${(cents / 100).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dateLabel = (value: string) => new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setRefreshing(true);
    try { setAccount(await getAccount()); setError(''); }
    catch { setError('No pudimos cargar tu cuenta. Intenta nuevamente.'); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return { account, refreshing, error, reload };
}
export function DemoNotice() {
  return <View className="mb-6 rounded-xl border border-gold/50 bg-white px-4 py-3">
    <Text className="text-xs font-semibold text-navy">Vista de prueba · Sin cobros reales</Text>
    <Text className="mt-1 text-xs leading-5 text-muted">Hora simulada: 8 oct 2026, 10:00 · Guatemala</Text>
  </View>;
}
export function Action({ label, onPress, disabled = false, secondary = false, accessibilityLabel }: { accessibilityLabel?: string; label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityLabel={accessibilityLabel ?? label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} className={`rounded-2xl px-5 py-4 ${secondary ? 'border border-navy bg-white' : 'bg-navy'} ${disabled ? 'opacity-40' : 'active:opacity-80'}`}>
    <Text className={`text-center text-base font-semibold ${secondary ? 'text-navy' : 'text-white'}`}>{label}</Text>
  </Pressable>;
}
export function Notice({ text }: { text: string }) { return <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-white p-4 text-sm leading-6 text-navy">{text}</Text>; }
