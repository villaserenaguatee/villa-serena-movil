import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Notice } from '../components/cuenta';
import { requestTestPushToken } from '../lib/notificaciones';

export default function PushTestScreen() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function test() {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const token = await requestTestPushToken();
      // Solo diagnóstico local explícito de OBJ-0F; no registra tokens en el API.
      console.info('Expo push token de prueba:', token);
      setMessage('Permiso concedido y token generado. Revisa la consola de Expo para enviar la notificación de prueba.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No pudimos obtener el token. Revisa la conexión y la configuración de Firebase.');
    } finally { setBusy(false); }
  }
  return <SafeAreaView edges={['bottom']} className="flex-1 bg-cream">
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text className="text-xs uppercase tracking-widest text-muted">Configuración de desarrollo</Text>
      <Text accessibilityRole="header" className="mt-3 text-3xl text-navy">Notificaciones</Text>
      <Text className="my-6 text-base leading-7 text-muted">Prueba en Android con el APK de desarrollo. Al continuar, la app solicitará permiso para recibir notificaciones.</Text>
      {message ? <Notice text={message} /> : null}
      <Action label={busy ? 'Comprobando…' : 'Probar permiso y token push'} onPress={test} disabled={busy} />
      <Text className="mt-5 text-sm leading-6 text-muted">El token se muestra únicamente en la consola local. Esta prueba no envía notificaciones ni lo registra con el backend.</Text>
    </ScrollView>
  </SafeAreaView>;
}
