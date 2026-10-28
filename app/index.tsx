import { useSyncExternalStore } from 'react';
import { sessionSnapshot, subscribeSession } from '../lib/sesion';
import { Link } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Welcome() {
  const session = useSyncExternalStore(subscribeSession, sessionSnapshot, () => null);
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView className="flex-1 bg-cream" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-between px-7 py-8">
          {/* Encabezado minimalista editorial */}
          <View className="items-center pt-2">
            <View className="rounded-full border border-line bg-sand px-4 py-1.5">
              <Text className="text-[10px] font-semibold uppercase tracking-[3.5px] text-muted">
                Hotel Boutique · Guatemala
              </Text>
            </View>
          </View>

          {/* Tarjeta central beige de bienvenida */}
          <View className="my-6 items-center rounded-[32px] border border-line bg-sand px-7 py-10">
            <View className="rounded-full border border-line bg-cream p-5">
              <Image
                source={require('../assets/villa-serena-logo.png')}
                accessibilityLabel="Logo de Hotel Villa Serena"
                resizeMode="contain"
                style={{ width: 136, height: 136 }}
              />
            </View>

            <View className="my-6 flex-row items-center gap-3">
              <View className="h-[1px] w-10 bg-gold" />
              <Text className="text-xs text-gold">✦</Text>
              <View className="h-[1px] w-10 bg-gold" />
            </View>

            <Text accessibilityRole="header" className="text-center text-4xl font-light tracking-wide text-navy">
              Villa Serena
            </Text>
            <Text className="mt-2 text-center text-xs font-semibold uppercase tracking-[3px] text-gold">
              Portal del Huésped
            </Text>
            <Text className="mt-4 text-center text-base leading-7 text-muted">
              Un espacio pensado para descansar y disfrutar. Acompañamos cada detalle de tu estancia con serenidad.
            </Text>

            <View className="mt-7 flex-row items-center justify-center border-t border-line pt-5">
              <View className="flex-1 items-center">
                <Text className="text-[10px] uppercase tracking-widest text-muted">Recepción</Text>
                <Text className="mt-1 text-xs font-semibold text-navy">24 horas</Text>
              </View>
              <View className="h-6 w-[1px] bg-line" />
              <View className="flex-1 items-center">
                <Text className="text-[10px] uppercase tracking-widest text-muted">Atención</Text>
                <Text className="mt-1 text-xs font-semibold text-navy">Personalizada</Text>
              </View>
              <View className="h-6 w-[1px] bg-line" />
              <View className="flex-1 items-center">
                <Text className="text-[10px] uppercase tracking-widest text-muted">Extensión</Text>
                <Text className="mt-1 text-xs font-semibold text-navy">100</Text>
              </View>
            </View>
          </View>

          {/* Acciones inferiores elegantes */}
          <View className="gap-3 pb-2">
            <Link href={session?.empleado ? session.empleado.debeCambiarContrasena ? '/personal/contrasena' : '/personal' : session ? '/reservas' : '/acceso'} asChild>
              <Pressable
                accessibilityRole="button"
                className="rounded-2xl border border-gold bg-gold px-6 py-4 active:opacity-85"
              >
                <Text className="text-center text-base font-semibold tracking-wide text-white">
                  {session?.empleado ? 'Ir a mi operación' : session ? 'Continuar a mi estancia' : 'Entrar con mi correo'}
                </Text>
              </Pressable>
            </Link>

            {!session && <Link href="/acceso-personal" asChild>
              <Pressable accessibilityRole="button" className="rounded-2xl border border-gold bg-sand px-6 py-4 active:opacity-85">
                <Text className="text-center text-base font-semibold text-navy">Soy personal del hotel</Text>
              </Pressable>
            </Link>}

            <Link href="/prueba-notificaciones" asChild>
              <Pressable accessibilityRole="button" className="py-2">
                <Text className="text-center text-xs text-muted">
                  Probar notificaciones · Desarrollo
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
