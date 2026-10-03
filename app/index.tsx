import { openDemoSession } from '../lib/mocks/estadia';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function Welcome() {
  return <SafeAreaView className="flex-1 bg-cream">
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 px-8 py-10">
        <Text className="text-xs font-semibold uppercase tracking-[4px] text-muted">Hotel boutique · Guatemala</Text>
        <View className="flex-1 justify-center py-16">
          <View className="mb-8 h-1 w-12 bg-gold" />
          <Text accessibilityRole="header" className="text-5xl font-light text-navy">Villa Serena</Text>
          <Text className="mt-6 text-2xl text-navy">Bienvenido a tu estadía.</Text>
          <Text className="mt-4 text-base leading-7 text-muted">Un espacio para descansar y disfrutar. Tu experiencia en Villa Serena comienza aquí.</Text>
        </View>
        <Link href="/acceso" asChild>
          <Pressable accessibilityRole="button" className="rounded-2xl bg-navy px-6 py-5 active:opacity-80">
            <Text className="text-center text-base font-semibold text-white">Entrar con mi correo</Text>
          </Pressable>
        </Link>
          <Pressable onPress={() => { openDemoSession(); router.push('/cuenta'); }} accessibilityRole="button" className="mt-3 rounded-2xl border border-navy px-6 py-4">
            <Text className="text-center text-sm font-semibold text-navy">Ver cuenta de prueba</Text>
          </Pressable>
        <Link href="/prueba-notificaciones" asChild>
          <Pressable accessibilityRole="button" className="mt-3 py-3">
            <Text className="text-center text-sm text-muted">Probar notificaciones · Desarrollo</Text>
          </Pressable>
        </Link>
        <Text className="mt-6 text-center text-xs text-muted">Villa Serena · Tu estancia, a tu alcance</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
