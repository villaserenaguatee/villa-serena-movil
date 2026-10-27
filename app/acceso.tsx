import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Action, Notice } from '../components/cuenta';
import { destinoTrasAcceso, listarReservas, solicitarCodigo, verificarCodigo } from '../lib/api/huesped';
export default function Access() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try { await action(); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  const request = () => run(async () => {
    const normalized = email.trim().toLowerCase();
    if (!z.email().safeParse(normalized).success) { setMessage('Escribe un correo válido.'); return; }
    setMessage(await solicitarCodigo(normalized)); setEmail(normalized); setStep('code'); setCode('');
  });
  const verify = () => run(async () => {
    await verificarCodigo(email, code);
    router.replace(destinoTrasAcceso(await listarReservas()));
  });
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
      <Text accessibilityRole="header" className="mb-4 text-3xl text-navy">{step === 'email' ? 'Tu estadía empieza aquí.' : 'Revisa tu código.'}</Text>
      <Text className="mb-6 text-base leading-7 text-muted">{step === 'email' ? 'Ingresa el mismo correo de tu reserva.' : `Escribe los seis dígitos que enviamos a ${email}. El código vence en 10 minutos.`}</Text>
      {message ? <Notice text={message} /> : null}
      {step === 'email' ? <TextInput accessibilityLabel="Correo de la reserva" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="tu@correo.com" className="mb-5 rounded-xl border border-muted/30 bg-white p-4 text-base text-navy" /> : <TextInput accessibilityLabel="Código de seis dígitos" value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} maxLength={6} keyboardType="number-pad" placeholder="000000" className="mb-5 rounded-xl border border-muted/30 bg-white p-4 text-2xl tracking-widest text-navy" />}
      <Action label={busy ? 'Un momento…' : step === 'email' ? 'Pedir código' : 'Entrar'} disabled={busy || (step === 'code' && code.length !== 6)} onPress={step === 'email' ? request : verify} />
      {step === 'code' ? <><Pressable accessibilityRole="button" disabled={busy} onPress={request} className="mt-4 py-3"><Text className="text-center text-navy">Pedir otro código</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => { setStep('email'); setMessage(''); }} className="py-3"><Text className="text-center text-muted">Cambiar correo</Text></Pressable></> : null}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
