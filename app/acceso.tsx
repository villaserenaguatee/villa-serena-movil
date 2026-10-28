import { useState } from 'react';
import { router } from 'expo-router';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}>
          {/* Cabecera en beige cálido */}
          <View className="items-center rounded-[28px] border border-line bg-sand px-6 py-7">
            <View className="rounded-full border border-line bg-cream p-3.5">
              <Image
                source={require('../assets/villa-serena-logo.png')}
                accessibilityLabel="Logo de Hotel Villa Serena"
                resizeMode="contain"
                style={{ width: 88, height: 88 }}
              />
            </View>
            <Text className="mt-4 text-[10px] font-semibold uppercase tracking-[3px] text-gold">
              {step === 'email' ? 'Acceso del Huésped' : 'Código de Verificación'}
            </Text>
            <Text accessibilityRole="header" className="mt-2 text-center text-2xl font-light text-navy">
              {step === 'email' ? 'Tu estancia empieza aquí' : 'Confirma tu ingreso'}
            </Text>
            <Text className="mt-2 text-center text-sm leading-6 text-muted">
              {step === 'email'
                ? 'Ingresa el mismo correo electrónico con el que registraste tu reserva.'
                : `Escribe los 6 dígitos enviados a ${email}. El código vence en 10 minutos.`}
            </Text>
          </View>

          {message ? <Notice text={message} /> : null}

          {/* Formulario limpio en tonos crema y arena */}
          <View className="gap-4 rounded-[28px] border border-line bg-white p-6">
            {step === 'email' ? (
              <View className="gap-2">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  Correo de la reserva
                </Text>
                <TextInput
                  accessibilityLabel="Correo de la reserva"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="tu@correo.com"
                  placeholderTextColor="#766f63"
                  className="rounded-2xl border border-line bg-cream p-4 text-base text-navy"
                />
              </View>
            ) : (
              <View className="gap-2">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  Código de 6 dígitos
                </Text>
                <TextInput
                  accessibilityLabel="Código de seis dígitos"
                  value={code}
                  onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  keyboardType="number-pad"
                  placeholder="000000"
                  placeholderTextColor="#766f63"
                  className="rounded-2xl border border-line bg-cream p-4 text-center text-3xl font-light tracking-[10px] text-navy"
                />
              </View>
            )}

            <Action
              label={busy ? 'Un momento…' : step === 'email' ? 'Pedir código' : 'Entrar'}
              disabled={busy || (step === 'code' && code.length !== 6)}
              onPress={step === 'email' ? request : verify}
            />

            {step === 'code' ? (
              <View className="mt-1 gap-2 border-t border-line pt-3">
                <Pressable accessibilityRole="button" disabled={busy} onPress={request} className="py-2">
                  <Text className="text-center text-sm font-semibold text-navy">Pedir otro código</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => { setStep('email'); setMessage(''); }}
                  className="py-2"
                >
                  <Text className="text-center text-sm text-muted">Cambiar correo</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
