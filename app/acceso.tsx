import { useState } from 'react';
import { router } from 'expo-router';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Action, money, Notice } from '../components/cuenta';
import {
  buscarDisponibilidadPublica,
  crearReservaPublica,
  destinoTrasAcceso,
  generarBorradorId,
  listarReservas,
  OpcionDisponiblePublica,
  solicitarCodigo,
  solicitarVerificacionReserva,
  verificarCodigo,
  verificarCorreoReserva,
} from '../lib/api/huesped';

function fechaMasDias(dias: number) {
  const d = new Date(Date.now() + dias * 86400000);
  return d.toISOString().slice(0, 10);
}

export default function Access() {
  const [modo, setModo] = useState<'login' | 'registro'>('login');

  // Estados de inicio de sesión
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Estados para crear reserva desde la app (sin depender de la web)
  const [entrada, setEntrada] = useState(() => fechaMasDias(1));
  const [salida, setSalida] = useState(() => fechaMasDias(3));
  const [numHuespedes, setNumHuespedes] = useState('1');
  const [opciones, setOpciones] = useState<OpcionDisponiblePublica[] | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<number | null>(null);

  const [nombre, setNombre] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [telefonoDigits, setTelefonoDigits] = useState('');
  const [tipoDoc, setTipoDoc] = useState<'DPI' | 'PASAPORTE'>('DPI');
  const [numDoc, setNumDoc] = useState('');
  const [nacionalidad, setNacionalidad] = useState('Guatemalteca');

  const [borradorId, setBorradorId] = useState(() => generarBorradorId());
  const [pasoReserva, setPasoReserva] = useState<'datos' | 'verificar'>('datos');
  const [codigoReservaOtp, setCodigoReservaOtp] = useState('');

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

  const buscarHabitaciones = () => run(async () => {
    setMessage('');
    const h = Math.max(1, parseInt(numHuespedes || '1', 10) || 1);
    const lista = await buscarDisponibilidadPublica(entrada.trim(), salida.trim(), h);
    setOpciones(lista);
    if (lista.length > 0) setTipoSeleccionado(lista[0].tipoHabitacion.id);
    else setMessage('No hay habitaciones disponibles para esas fechas.');
  });

  const pedirCodigoNuevaReserva = () => run(async () => {
    setMessage('');
    const correoLimpio = correoNuevo.trim().toLowerCase();
    if (!tipoSeleccionado) { setMessage('Primero busca y selecciona un tipo de habitación.'); return; }
    if (!nombre.trim()) { setMessage('Escribe tu nombre completo.'); return; }
    if (!z.email().safeParse(correoLimpio).success) { setMessage('Escribe un correo electrónico válido.'); return; }
    const digitosTel = telefonoDigits.replace(/\D/g, '');
    if (digitosTel.length !== 8) { setMessage('Ingresa los 8 dígitos de tu teléfono en Guatemala.'); return; }
    if (tipoDoc === 'DPI' && !/^\d{13}$/.test(numDoc.trim())) {
      setMessage('El DPI debe tener exactamente 13 dígitos numéricos.');
      return;
    }
    if (tipoDoc === 'PASAPORTE' && !/^[A-Za-z0-9]{4,30}$/.test(numDoc.trim())) {
      setMessage('Ingresa un número de pasaporte válido.');
      return;
    }
    const nuevoDraft = generarBorradorId();
    setBorradorId(nuevoDraft);
    await solicitarVerificacionReserva(correoLimpio, nuevoDraft, nombre.trim());
    setPasoReserva('verificar');
    setCodigoReservaOtp('');
    setMessage(`Enviamos un código de 6 dígitos a ${correoLimpio} para confirmar tu reserva.`);
  });

  const confirmarYCrearReserva = () => run(async () => {
    setMessage('');
    const correoLimpio = correoNuevo.trim().toLowerCase();
    const h = Math.max(1, parseInt(numHuespedes || '1', 10) || 1);
    const verif = await verificarCorreoReserva(correoLimpio, borradorId, codigoReservaOtp);
    const creada = await crearReservaPublica(
      {
        tipoHabitacionId: tipoSeleccionado!,
        entrada: entrada.trim(),
        salida: salida.trim(),
        numeroHuespedes: h,
        huesped: {
          nombreCompleto: nombre.trim(),
          correo: correoLimpio,
          telefono: `+502 ${telefonoDigits.replace(/\D/g, '')}`,
          nacionalidad: nacionalidad.trim() || 'Guatemalteca',
          tipoDocumento: tipoDoc,
          numeroDocumento: numDoc.trim(),
          ...(tipoDoc === 'PASAPORTE' ? { paisEmisorPasaporte: 'GT' } : {}),
        },
      },
      borradorId,
      verif.comprobante,
    );
    // Solicita inmediatamente el código de acceso a la app para entrar directo
    await solicitarCodigo(correoLimpio);
    setEmail(correoLimpio);
    setModo('login');
    setStep('code');
    setCode('');
    setMessage(`¡Reserva ${creada.codigo} creada! Te enviamos un código de acceso a ${correoLimpio} para entrar a tu estancia.`);
  });

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 16 }}>
          {/* Cabecera en beige cálido */}
          <View className="items-center rounded-[28px] border border-line bg-sand px-6 py-6">
            <View className="rounded-full border border-line bg-cream p-3">
              <Image
                source={require('../assets/villa-serena-logo.png')}
                accessibilityLabel="Logo de Hotel Villa Serena"
                resizeMode="contain"
                style={{ width: 80, height: 80 }}
              />
            </View>
            <Text className="mt-3 text-[10px] font-semibold uppercase tracking-[3px] text-gold">
              Portal del Huésped
            </Text>
            <Text accessibilityRole="header" className="mt-1 text-center text-2xl font-light text-navy">
              {modo === 'login' ? 'Acceso a tu estancia' : 'Reservar desde la app'}
            </Text>

            {/* Selector de pestaña: Iniciar sesión vs Crear reserva */}
            <View className="mt-4 flex-row gap-2 self-stretch rounded-2xl border border-line bg-cream p-1.5">
              <Pressable
                onPress={() => { setModo('login'); setMessage(''); }}
                className={`flex-1 rounded-xl py-2.5 ${modo === 'login' ? 'bg-gold' : 'bg-transparent'}`}
              >
                <Text className={`text-center text-xs font-semibold ${modo === 'login' ? 'text-white' : 'text-navy'}`}>
                  Iniciar sesión
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setModo('registro'); setMessage(''); }}
                className={`flex-1 rounded-xl py-2.5 ${modo === 'registro' ? 'bg-gold' : 'bg-transparent'}`}
              >
                <Text className={`text-center text-xs font-semibold ${modo === 'registro' ? 'text-white' : 'text-navy'}`}>
                  Nueva reserva
                </Text>
              </Pressable>
            </View>
          </View>

          {message ? <Notice text={message} /> : null}

          {modo === 'login' ? (
            <View className="gap-4 rounded-[28px] border border-line bg-white p-6">
              <Text className="text-sm leading-6 text-muted">
                {step === 'email'
                  ? 'Ingresa el correo electrónico de tu reserva para recibir tu código de acceso.'
                  : `Escribe los 6 dígitos enviados a ${email}. El código vence en 10 minutos.`}
              </Text>

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
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { setModo('registro'); setMessage(''); }}
                  className="border-t border-line pt-4"
                >
                  <Text className="text-center text-xs text-muted">
                    ¿Aún no tienes una reserva? <Text className="font-semibold text-gold">Créala aquí desde la app</Text>
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            /* Modo: Crear reserva y registrarse desde la app sin depender de la web */
            <View className="gap-4 rounded-[28px] border border-line bg-white p-6">
              {pasoReserva === 'datos' ? (
                <>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-gold">
                    1. Fechas y habitación
                  </Text>
                  <View className="flex-row gap-2">
                    <View className="flex-1 gap-1">
                      <Text className="text-[10px] uppercase text-muted">Entrada (AAAA-MM-DD)</Text>
                      <TextInput
                        value={entrada}
                        onChangeText={setEntrada}
                        placeholder="2026-10-28"
                        className="rounded-xl border border-line bg-cream p-3 text-sm text-navy"
                      />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-[10px] uppercase text-muted">Salida (AAAA-MM-DD)</Text>
                      <TextInput
                        value={salida}
                        onChangeText={setSalida}
                        placeholder="2026-10-30"
                        className="rounded-xl border border-line bg-cream p-3 text-sm text-navy"
                      />
                    </View>
                  </View>

                  <View className="gap-1">
                    <Text className="text-[10px] uppercase text-muted">Número de huéspedes</Text>
                    <TextInput
                      value={numHuespedes}
                      onChangeText={v => setNumHuespedes(v.replace(/\D/g, '').slice(0, 1))}
                      keyboardType="number-pad"
                      placeholder="1"
                      className="rounded-xl border border-line bg-cream p-3 text-sm text-navy"
                    />
                  </View>

                  <Action
                    label={busy ? 'Buscando…' : 'Buscar habitaciones disponibles'}
                    secondary
                    disabled={busy}
                    onPress={buscarHabitaciones}
                  />

                  {opciones && opciones.length > 0 ? (
                    <View className="gap-2">
                      <Text className="text-xs font-semibold uppercase tracking-widest text-gold">
                        Selecciona tu habitación ({opciones[0].noches} {opciones[0].noches === 1 ? 'noche' : 'noches'})
                      </Text>
                      {opciones.map(op => {
                        const sel = tipoSeleccionado === op.tipoHabitacion.id;
                        return (
                          <Pressable
                            key={op.tipoHabitacion.id}
                            onPress={() => setTipoSeleccionado(op.tipoHabitacion.id)}
                            className={`gap-1 rounded-2xl border p-4 ${sel ? 'border-gold bg-sand' : 'border-line bg-cream'}`}
                          >
                            <View className="flex-row items-center justify-between">
                              <Text className="text-base font-semibold text-navy">{op.tipoHabitacion.nombre}</Text>
                              <Text className="text-sm font-bold text-navy">{money(op.total)}</Text>
                            </View>
                            <Text className="text-xs text-muted">
                              Capacidad: {op.tipoHabitacion.capacidad} · Base {money(op.tipoHabitacion.precioBaseNoche)}/noche
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  <Text className="mt-2 text-xs font-semibold uppercase tracking-widest text-gold">
                    2. Tus datos de huésped
                  </Text>

                  <View className="gap-1">
                    <Text className="text-[10px] uppercase text-muted">Nombre completo</Text>
                    <TextInput
                      value={nombre}
                      onChangeText={setNombre}
                      placeholder="Ej. Carlos Gómez"
                      className="rounded-xl border border-line bg-cream p-3.5 text-sm text-navy"
                    />
                  </View>

                  <View className="gap-1">
                    <Text className="text-[10px] uppercase text-muted">Correo electrónico</Text>
                    <TextInput
                      value={correoNuevo}
                      onChangeText={setCorreoNuevo}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      placeholder="tucorreo@gmail.com"
                      className="rounded-xl border border-line bg-cream p-3.5 text-sm text-navy"
                    />
                  </View>

                  <View className="gap-1">
                    <Text className="text-[10px] uppercase text-muted">Teléfono Guatemala (+502 · 8 dígitos)</Text>
                    <TextInput
                      value={telefonoDigits}
                      onChangeText={v => setTelefonoDigits(v.replace(/\D/g, '').slice(0, 8))}
                      keyboardType="phone-pad"
                      placeholder="12345678"
                      maxLength={8}
                      className="rounded-xl border border-line bg-cream p-3.5 text-sm text-navy"
                    />
                  </View>

                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setTipoDoc('DPI')}
                      className={`flex-1 rounded-xl border py-2.5 ${tipoDoc === 'DPI' ? 'border-gold bg-sand' : 'border-line bg-cream'}`}
                    >
                      <Text className="text-center text-xs font-semibold text-navy">DPI (13 dígitos)</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setTipoDoc('PASAPORTE')}
                      className={`flex-1 rounded-xl border py-2.5 ${tipoDoc === 'PASAPORTE' ? 'border-gold bg-sand' : 'border-line bg-cream'}`}
                    >
                      <Text className="text-center text-xs font-semibold text-navy">Pasaporte</Text>
                    </Pressable>
                  </View>

                  <View className="gap-1">
                    <Text className="text-[10px] uppercase text-muted">
                      Número de {tipoDoc === 'DPI' ? 'DPI (13 dígitos)' : 'Pasaporte'}
                    </Text>
                    <TextInput
                      value={numDoc}
                      onChangeText={v => setNumDoc(tipoDoc === 'DPI' ? v.replace(/\D/g, '').slice(0, 13) : v.slice(0, 30))}
                      keyboardType={tipoDoc === 'DPI' ? 'number-pad' : 'default'}
                      placeholder={tipoDoc === 'DPI' ? '1234567890101' : 'A12345678'}
                      maxLength={tipoDoc === 'DPI' ? 13 : 30}
                      className="rounded-xl border border-line bg-cream p-3.5 text-sm text-navy"
                    />
                  </View>

                  <Action
                    label={busy ? 'Enviando código…' : 'Verificar correo y crear reserva'}
                    disabled={busy || !tipoSeleccionado}
                    onPress={pedirCodigoNuevaReserva}
                  />
                </>
              ) : (
                <>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-gold">
                    Confirmar correo de la reserva
                  </Text>
                  <Text className="text-sm text-muted">
                    Ingresa el código de 6 dígitos que enviamos a {correoNuevo.trim().toLowerCase()} para crear tu reserva.
                  </Text>
                  <TextInput
                    value={codigoReservaOtp}
                    onChangeText={v => setCodigoReservaOtp(v.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    keyboardType="number-pad"
                    placeholder="000000"
                    className="rounded-2xl border border-line bg-cream p-4 text-center text-3xl font-light tracking-[10px] text-navy"
                  />
                  <Action
                    label={busy ? 'Creando reserva…' : 'Confirmar y crear mi reserva'}
                    disabled={busy || codigoReservaOtp.length !== 6}
                    onPress={confirmarYCrearReserva}
                  />
                  <Pressable
                    disabled={busy}
                    onPress={() => { setPasoReserva('datos'); setMessage(''); }}
                    className="py-2"
                  >
                    <Text className="text-center text-sm text-muted">Volver a mis datos</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
