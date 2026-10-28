import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../lib/api';
import { Action, Notice } from './cuenta';

export function PersonalPage({ title, error, refreshing = false, reload, children }: { title: string; error?: string; refreshing?: boolean; reload?: () => Promise<unknown>; children: ReactNode }) {
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }} refreshControl={reload ? <RefreshControl refreshing={refreshing} onRefresh={() => { void reload(); }} /> : undefined}>
    <Text accessibilityRole="header" className="text-3xl text-navy">{title}</Text>
    {error ? <Notice text={error} /> : null}
    {reload ? <Action label={refreshing ? 'Actualizando…' : 'Actualizar'} secondary disabled={refreshing} onPress={() => { void reload(); }} /> : null}
    {children}
  </ScrollView></SafeAreaView>;
}
export function Card({ children }: { children: ReactNode }) { return <View className="gap-3 rounded-2xl bg-white p-5">{children}</View>; }
export function Campo({ label, value, onChange, maxLength = 2000, secret = false, multiline = false, disabled = false }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number; secret?: boolean; multiline?: boolean; disabled?: boolean }) {
  return <View className="gap-2"><Text className="font-semibold text-navy">{label}</Text><TextInput accessibilityLabel={label} accessibilityState={{ disabled }} editable={!disabled} value={value} onChangeText={onChange} maxLength={maxLength} secureTextEntry={secret} autoCapitalize="none" autoCorrect={false} multiline={multiline} textAlignVertical={multiline ? 'top' : 'auto'} className="rounded-xl border border-muted/30 bg-white p-4 text-base text-navy" /></View>;
}
export function useAccion(reload?: () => Promise<unknown>) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function run(work: () => Promise<unknown>) {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError('');
    try { await work(); await reload?.(); return true; }
    catch (cause) {
      const uncertain = cause instanceof ApiError && cause.status === 0;
      setError(uncertain ? 'No se confirmó la operación. Actualiza el estado antes de reintentar.' : cause instanceof Error ? cause.message : 'No se pudo completar la operación.');
      // Se consulta el resultado; nunca se repite automáticamente la escritura.
      await reload?.(); return false;
    } finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, run };
}
