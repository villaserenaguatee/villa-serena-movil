import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Action, Notice } from '../components/cuenta';
import { DEMO_CODE, DEMO_EMAIL, getStays, requestDemoCode, verifyDemoCode } from '../lib/mocks/estadia';
export default function Access() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [message, setMessage] = useState('');
  function request() {
    const normalized = email.trim().toLowerCase();
    if (!z.email().safeParse(normalized).success) { setMessage('Escribe un correo válido.'); return; }
    try { setMessage(requestDemoCode(normalized)); setStep('code'); setCode(''); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function verify() {
    try {
      verifyDemoCode(code);
      const id = (await getStays()).find(stay => stay.status === 'EN_ESTADIA')?.id;
      router.replace(id ? { pathname: '/estadia', params: { id } } : '/reservas');
    } catch (error) { setMessage((error as Error).message); }
  }
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
      <Notice text={`Acceso de demostración. Correo: ${DEMO_EMAIL} · Código: ${DEMO_CODE}. No se envían correos ni se crea una sesión real.`} />
      <Text accessibilityRole="header" className="mb-4 text-3xl text-navy">{step === 'email' ? 'Tu estadía empieza aquí.' : 'Revisa tu código.'}</Text>
      <Text className="mb-6 text-base leading-7 text-muted">{step === 'email' ? 'Ingresa el mismo correo de tu reserva.' : 'Escribe los seis dígitos de tu código de acceso.'}</Text>
      {message ? <Notice text={message} /> : null}
      {step === 'email' ? <TextInput accessibilityLabel="Correo de la reserva" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="tu@correo.com" className="mb-5 rounded-xl border border-muted/30 bg-white p-4 text-base text-navy" /> : <TextInput accessibilityLabel="Código de seis dígitos" value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} maxLength={6} keyboardType="number-pad" placeholder="000000" className="mb-5 rounded-xl border border-muted/30 bg-white p-4 text-2xl tracking-widest text-navy" />}
      <Action label={step === 'email' ? 'Pedir código' : 'Entrar'} disabled={step === 'code' && code.length !== 6} onPress={step === 'email' ? request : verify} />
      {step === 'code' ? <><Pressable accessibilityRole="button" onPress={request} className="mt-4 py-3"><Text className="text-center text-navy">Pedir otro código</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setStep('email'); setMessage(''); }} className="py-3"><Text className="text-center text-muted">Cambiar correo</Text></Pressable></> : null}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
