import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Action, dateLabel, Loading, money, Notice, useCarga } from '../components/cuenta';
import { abrirPasarela, esperarAcreditacion, iniciarPagoSaldo } from '../lib/api/checkout';
import { consultarCuenta, estadoPagoLabel, metodoPagoLabel } from '../lib/api/cuenta';
import { consultarMenu, crearPedido, estadoPedidoLabel, listarPedidos, totalCarrito } from '../lib/api/pedidos';
import {
  cancelarSolicitud,
  describirSolicitud,
  estadoSolicitudLabel,
  listarArticulos,
  listarSolicitudes,
  solicitarArticulos,
  solicitarLimpieza,
} from '../lib/api/solicitudes';
import {
  cerrarSesion,
  consultarPerfil,
  consultarWifi,
  detalleReserva,
  enviarMensajeChat,
  esperarPagoReservaPublica,
  estadoReservaLabel,
  iniciarPagoReservaPublica,
  listarAmenidades,
  listarDocumentosCheckin,
  listarMensajesChat,
  reservaActual,
} from '../lib/api/huesped';

type SeccionPortal = 'inicio' | 'checkin' | 'menu' | 'servicios' | 'chat' | 'habitacion' | 'experiencias' | 'cuenta' | 'reservar' | 'perfil';

const SECCIONES: { id: SeccionPortal; label: string }[] = [
  { id: 'inicio', label: 'Mi estancia' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'menu', label: 'Menú' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'chat', label: 'Chat' },
  { id: 'habitacion', label: 'Mi habitación' },
  { id: 'experiencias', label: 'Experiencias' },
  { id: 'cuenta', label: 'Cuenta y Pagos' },
  { id: 'reservar', label: 'Gestionar' },
  { id: 'perfil', label: 'Perfil' },
];

const CATEGORIAS_EXP = ['Todos', 'Restaurante', 'Spa', 'Piscina', 'Experiencias', 'Transporte'] as const;

const EXPERIENCIAS = [
  { id: 'mesa', categoria: 'Restaurante', nombre: 'Reserva de Mesa', descripcion: 'Reserva una mesa en el restaurante Mirador de Villa Serena durante tu estancia.', precio: 'Sin costo' },
  { id: 'cena-romantica', categoria: 'Restaurante', nombre: 'Cena Romántica', descripcion: 'Mesa privada decorada, arreglo floral, entrada para compartir, dos platos fuertes y postre especial.', precio: 'Q 650.00' },
  { id: 'spa-relajante', categoria: 'Spa', nombre: 'Masaje Relajante (60 min)', descripcion: 'Masaje corporal enfocado en liberar tensión y proporcionar descanso.', precio: 'Q 425.00' },
  { id: 'spa-piedras', categoria: 'Spa', nombre: 'Masaje con Piedras Calientes (60 min)', descripcion: 'Masaje corporal acompañado de piedras calientes.', precio: 'Q 475.00' },
  { id: 'spa-facial', categoria: 'Spa', nombre: 'Facial Relajante (45 min)', descripcion: 'Sesión facial de limpieza, hidratación y cuidado de la piel.', precio: 'Q 325.00' },
  { id: 'piscina-area', categoria: 'Piscina', nombre: 'Reserva de Área de Piscina', descripcion: 'Espacio con acceso a piscina climatizada, toalla y área de descanso.', precio: 'Incluido' },
  { id: 'tour-antigua', categoria: 'Experiencias', nombre: 'Recorrido Cultural y Miradores', descripcion: 'Experiencia guiada por los alrededores y jardines de Villa Serena.', precio: 'Q 350.00' },
  { id: 'traslado-aeropuerto', categoria: 'Transporte', nombre: 'Traslado Privado', descripcion: 'Transporte privado coordinado con Recepción hacia o desde el hotel.', precio: 'Q 280.00' },
] as const;

export default function StayScreen() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const [seccion, setSeccion] = useState<SeccionPortal>('inicio');
  const [catExp, setCatExp] = useState<(typeof CATEGORIAS_EXP)[number]>('Todos');

  // Estados para Menú (Room Service)
  const [subTabMenu, setSubTabMenu] = useState<'catalogo' | 'pedidos'>('catalogo');
  const [catMenuId, setCatMenuId] = useState<number | null>(null);
  const [busquedaMenu, setBusquedaMenu] = useState('');
  const [carrito, setCarrito] = useState<Record<number, number>>({});
  const [notasPedido, setNotasPedido] = useState('');
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [avisoMenu, setAvisoMenu] = useState<string | null>(null);

  // Estados para Servicios (Limpieza y artículos)
  const [subTabServ, setSubTabServ] = useState<'solicitar' | 'historial'>('solicitar');
  const [comentarioLimpieza, setComentarioLimpieza] = useState('');
  const [cantArticulos, setCantArticulos] = useState<Record<number, number>>({});
  const [enviandoServ, setEnviandoServ] = useState(false);
  const [avisoServ, setAvisoServ] = useState<string | null>(null);

  // Estados para Chat
  const [mensajeTexto, setMensajeTexto] = useState('');
  const [enviandoChat, setEnviandoChat] = useState(false);
  const [avisoChat, setAvisoChat] = useState<string | null>(null);

  // Estados para Pago con Recurrente
  const [pagando, setPagando] = useState(false);
  const [avisoPago, setAvisoPago] = useState<string | null>(null);

  const cargarTodo = useCallback(async () => {
    const cod = await reservaActual(codigo);
    const [stay, perfil, cuenta, menu, pedidos, articulos, solicitudes, wifi, amenidades, mensajes, documentos] = await Promise.all([
      detalleReserva(cod),
      consultarPerfil().catch(() => null),
      consultarCuenta(cod).catch(() => null),
      consultarMenu(cod).catch(() => null),
      listarPedidos(cod).catch(() => []),
      listarArticulos(cod).catch(() => []),
      listarSolicitudes(cod).catch(() => []),
      consultarWifi().catch(() => null),
      listarAmenidades().catch(() => []),
      listarMensajesChat(cod).catch(() => []),
      listarDocumentosCheckin(cod).catch(() => []),
    ]);
    return { stay, perfil, cuenta, menu, pedidos, articulos, solicitudes, wifi, amenidades, mensajes, documentos };
  }, [codigo]);

  const { data, refreshing, error, reload } = useCarga(cargarTodo);
  const stay = data?.stay;
  const perfil = data?.perfil;
  const cuenta = data?.cuenta;
  const menu = data?.menu;
  const pedidos = data?.pedidos ?? [];
  const articulos = data?.articulos ?? [];
  const solicitudes = data?.solicitudes ?? [];
  const wifi = data?.wifi;
  const amenidades = data?.amenidades ?? [];
  const mensajes = data?.mensajes ?? [];
  const documentos = data?.documentos ?? [];

  const active = stay?.estado === 'EN_ESTADIA';
  const cerrada = stay?.estado === 'FINALIZADA' || stay?.estado === 'CANCELADA';
  const pedidosActivos = pedidos.filter(p => p.estado !== 'ENTREGADO' && p.estado !== 'CANCELADO');
  const primerNombre = perfil?.nombreCompleto?.split(/\s+/)[0] ?? 'Huésped';

  const go = (pathname: '/cuenta' | '/room-service' | '/pedidos' | '/solicitudes') => {
    if (stay) router.push({ pathname, params: { codigo: stay.codigo } });
  };

  const seleccionarTab = (id: SeccionPortal) => {
    setSeccion(id);
  };

  async function handleCrearPedido() {
    if (!stay || !active || enviandoPedido) return;
    setEnviandoPedido(true);
    setAvisoMenu(null);
    try {
      await crearPedido(stay.codigo, carrito, notasPedido);
      setCarrito({});
      setNotasPedido('');
      setSubTabMenu('pedidos');
      setAvisoMenu('Pedido enviado correctamente a Room Service.');
      await reload();
    } catch (e) {
      setAvisoMenu(e instanceof Error ? e.message : 'No se pudo enviar el pedido.');
    } finally {
      setEnviandoPedido(false);
    }
  }

  async function handleLimpieza() {
    if (!stay || !active || enviandoServ) return;
    setEnviandoServ(true);
    setAvisoServ(null);
    try {
      await solicitarLimpieza(stay.codigo, comentarioLimpieza);
      setComentarioLimpieza('');
      setSubTabServ('historial');
      setAvisoServ('Solicitud de limpieza enviada.');
      await reload();
    } catch (e) {
      setAvisoServ(e instanceof Error ? e.message : 'No se pudo solicitar la limpieza.');
    } finally {
      setEnviandoServ(false);
    }
  }

  async function handleArticulos() {
    if (!stay || !active || enviandoServ) return;
    setEnviandoServ(true);
    setAvisoServ(null);
    try {
      await solicitarArticulos(stay.codigo, cantArticulos);
      setCantArticulos({});
      setSubTabServ('historial');
      setAvisoServ('Solicitud de artículos enviada.');
      await reload();
    } catch (e) {
      setAvisoServ(e instanceof Error ? e.message : 'No se pudieron solicitar los artículos.');
    } finally {
      setEnviandoServ(false);
    }
  }

  async function handleCancelarSolicitud(id: number) {
    if (!stay || enviandoServ) return;
    setEnviandoServ(true);
    setAvisoServ(null);
    try {
      await cancelarSolicitud(stay.codigo, id);
      setAvisoServ('Solicitud cancelada.');
      await reload();
    } catch (e) {
      setAvisoServ(e instanceof Error ? e.message : 'No se pudo cancelar la solicitud.');
    } finally {
      setEnviandoServ(false);
    }
  }

  async function handleEnviarChat() {
    if (!stay || !mensajeTexto.trim() || enviandoChat) return;
    setEnviandoChat(true);
    setAvisoChat(null);
    try {
      await enviarMensajeChat(stay.codigo, mensajeTexto);
      setMensajeTexto('');
      await reload();
    } catch (e) {
      setAvisoChat(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.');
    } finally {
      setEnviandoChat(false);
    }
  }

  async function handlePagarRecurrente() {
    if (!stay || pagando) return;
    setPagando(true);
    setAvisoPago(null);
    try {
      if (stay.estado === 'PENDIENTE_PAGO') {
        const sesion = await iniciarPagoReservaPublica(stay.codigo);
        await abrirPasarela(sesion.urlPago);
        const est = await esperarPagoReservaPublica(stay.codigo, 8, 2500);
        setAvisoPago(
          est.estadoReserva === 'CONFIRMADA'
            ? '¡Pago confirmado! Tu reserva ya está confirmada.'
            : 'Estamos verificando tu pago con Recurrente. Desliza para actualizar en unos segundos.',
        );
      } else if (stay.estado === 'EN_ESTADIA') {
        const sesion = await iniciarPagoSaldo(stay.codigo);
        if (sesion?.urlPago) {
          await abrirPasarela(sesion.urlPago);
          await esperarAcreditacion(stay.codigo, 8, 2500);
          setAvisoPago('Pago procesado con Recurrente.');
        } else {
          setAvisoPago('Tu saldo actual ya está en Q 0.00.');
        }
      }
      await reload();
    } catch (e) {
      setAvisoPago(e instanceof Error ? e.message : 'No se pudo iniciar el pago con Recurrente.');
    } finally {
      setPagando(false);
    }
  }

  const alojTotal = cuenta?.cargos.filter(c => c.tipo === 'ALOJAMIENTO' && c.estado === 'VIGENTE').reduce((acc, c) => acc + c.monto, 0) ?? 0;
  const extrasTotal = cuenta ? Math.max(0, cuenta.totalCargosVigentes - alojTotal) : 0;
  const totalMenu = menu ? totalCarrito(menu, carrito) : 0;

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-cream">
      {/* Cabecera estilo Portal del Huésped en beige cálido */}
      {stay ? (
        <View className="border-b border-line bg-sand px-5 pb-3.5 pt-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-[10px] font-semibold uppercase tracking-[2.5px] text-gold">Bienvenida a Villa Serena</Text>
              <Text className="mt-0.5 text-2xl font-light text-navy">Hola, {primerNombre}</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable onPress={() => router.push('/reservas')} className="rounded-xl border border-line bg-cream px-3 py-1.5">
                <Text className="text-xs font-semibold text-navy">Reservas</Text>
              </Pressable>
              <Pressable onPress={() => setSeccion('perfil')} className="rounded-xl bg-gold px-3 py-1.5">
                <Text className="text-xs font-semibold text-white">Perfil</Text>
              </Pressable>
            </View>
          </View>
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <View className="rounded-full border border-line bg-cream px-2.5 py-0.5">
              <Text className="text-xs font-semibold text-gold">{estadoReservaLabel[stay.estado]}</Text>
            </View>
            <Text className="text-xs text-muted">
              {stay.codigo} · Hab. {stay.habitacion?.numero ?? 'Por asignar'} · Salida {stay.salida}
            </Text>
          </View>

          {/* Barra de pestañas idéntica a Huésped Web */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 8 }}>
            {SECCIONES.map(tab => {
              const isSelected = seccion === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => seleccionarTab(tab.id)}
                  className={`rounded-full border px-3.5 py-1.5 ${isSelected ? 'border-gold bg-gold' : 'border-line bg-cream'}`}
                >
                  <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-navy'}`}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        className="flex-1 bg-cream"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
      >
        {error ? <Notice text={error} /> : null}
        {!stay && !error ? <Loading label="Cargando portal del huésped…" /> : null}

        {/* Pestaña: MI ESTANCIA (inicio) */}
        {stay && seccion === 'inicio' ? (
          <>
            {avisoPago ? <Notice text={avisoPago} /> : null}

            {stay.estado === 'PENDIENTE_PAGO' ? (
              <View className="gap-3 rounded-3xl border border-gold bg-sand p-5">
                <Text className="text-xs font-semibold uppercase tracking-widest text-gold">
                  Acción requerida · Reserva pendiente de pago
                </Text>
                <Text className="text-lg font-semibold text-navy">
                  Confirma tu reserva con Recurrente
                </Text>
                <Text className="text-xs leading-5 text-muted">
                  Realiza el pago de tu alojamiento en línea para pasar tu reserva a Confirmada. En modo prueba puedes usar la tarjeta 4242 4242 4242 4242.
                </Text>
                <Action
                  label={pagando ? 'Abriendo pasarela Recurrente…' : `Pagar reserva ahora${cuenta ? ` · ${money(cuenta.saldo)}` : ''}`}
                  disabled={pagando}
                  onPress={() => { void handlePagarRecurrente(); }}
                />
              </View>
            ) : null}

            {!cerrada ? (
              <View className="gap-2 rounded-2xl border border-gold bg-white p-4">
                <Text className="text-base font-semibold text-navy">Documentos del check-in</Text>
                <Text className="text-sm text-muted">
                  {stay.estado === 'CONFIRMADA' || stay.estado === 'EN_ESTADIA'
                    ? 'Consulta el estado de tus documentos de identificación o coordina tu registro con Recepción.'
                    : 'Tu reserva debe estar confirmada antes de enviar documentos.'}
                </Text>
                <Pressable
                  onPress={() => setSeccion('checkin')}
                  className="mt-1 self-start rounded-xl bg-navy px-4 py-2.5"
                >
                  <Text className="text-xs font-semibold text-white">Ir a Check-in ({documentos.length})</Text>
                </Pressable>
              </View>
            ) : null}

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-navy">Tu estancia</Text>
                <Text className="text-xs font-bold text-navy">{stay.codigo}</Text>
              </View>
              <Text className="text-xl font-semibold text-navy">
                Habitación {stay.habitacion?.numero ?? 'Pendiente de asignación'}
              </Text>
              <Text className="text-sm text-muted">
                {stay.tipoHabitacion.nombre} · {stay.numeroHuespedes} {stay.numeroHuespedes === 1 ? 'huésped' : 'huéspedes'}
              </Text>
              <View className="mt-1 flex-row gap-3">
                <View className="flex-1 rounded-xl border border-line bg-cream p-3">
                  <Text className="text-[10px] uppercase tracking-widest text-muted">Entrada</Text>
                  <Text className="mt-1 text-sm font-semibold text-navy">{stay.entrada}</Text>
                </View>
                <View className="flex-1 rounded-xl border border-line bg-cream p-3">
                  <Text className="text-[10px] uppercase tracking-widest text-muted">Check-out</Text>
                  <Text className="mt-1 text-sm font-semibold text-navy">{stay.salida} · {stay.horaCheckOut}</Text>
                </View>
              </View>
            </View>

            <View className="gap-2 rounded-3xl border border-line bg-white p-5">
              <Text className="text-lg font-bold text-navy">Llave digital</Text>
              <Text className="text-sm font-semibold text-navy">
                {active ? `Habitación ${stay.habitacion?.numero ?? 'Asignada'} · Activa en Recepción` : 'Llave digital no disponible'}
              </Text>
              <Text className="text-sm text-muted">
                Solicita tu llave en Recepción o consulta los controles y el Wi-Fi de tu habitación.
              </Text>
              <Pressable onPress={() => setSeccion('habitacion')} className="mt-2 self-start rounded-xl border border-navy px-4 py-2">
                <Text className="text-xs font-semibold text-navy">Ver mi habitación y Wi-Fi</Text>
              </Pressable>
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-navy">Tu cuenta</Text>
                <Pressable onPress={() => setSeccion('cuenta')}>
                  <Text className="text-xs font-semibold text-navy underline">Ver cargos y pagar</Text>
                </Pressable>
              </View>
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-[10px] uppercase tracking-widest text-muted">Saldo por pagar</Text>
                  <Text className="mt-1 text-2xl font-bold text-navy">
                    {cuenta ? money(cuenta.saldo) : 'Consultando…'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] uppercase tracking-widest text-muted">Total de la estancia</Text>
                  <Text className="mt-1 text-base font-semibold text-navy">
                    {cuenta ? money(cuenta.totalCargosVigentes) : '—'}
                  </Text>
                </View>
              </View>
              {cuenta ? (
                <View className="flex-row gap-2">
                  <View className="flex-1 rounded-xl border border-line bg-cream p-2.5">
                    <Text className="text-[10px] uppercase text-muted">Alojamiento</Text>
                    <Text className="mt-0.5 text-xs font-semibold text-navy">{money(alojTotal)}</Text>
                  </View>
                  <View className="flex-1 rounded-xl border border-line bg-cream p-2.5">
                    <Text className="text-[10px] uppercase text-muted">Consumos</Text>
                    <Text className="mt-0.5 text-xs font-semibold text-navy">{money(extrasTotal)}</Text>
                  </View>
                  <View className="flex-1 rounded-xl border border-line bg-cream p-2.5">
                    <Text className="text-[10px] uppercase text-muted">Pagado</Text>
                    <Text className="mt-0.5 text-xs font-semibold text-navy">{money(cuenta.totalPagosAprobados)}</Text>
                  </View>
                </View>
              ) : null}
              {cuenta && cuenta.saldo > 0 && (stay.estado === 'PENDIENTE_PAGO' || stay.estado === 'EN_ESTADIA') ? (
                <Action
                  label={pagando ? 'Abriendo Recurrente…' : `Pagar con Recurrente · ${money(cuenta.saldo)}`}
                  disabled={pagando}
                  onPress={() => { void handlePagarRecurrente(); }}
                />
              ) : null}
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-navy">Pedidos en curso</Text>
                <Pressable onPress={() => setSeccion('menu')}>
                  <Text className="text-xs font-semibold text-navy underline">Abrir menú</Text>
                </Pressable>
              </View>
              {pedidosActivos.length === 0 ? (
                <Text className="text-sm text-muted">No tienes pedidos en curso.</Text>
              ) : (
                pedidosActivos.map(pedido => (
                  <Pressable
                    key={pedido.id}
                    onPress={() => { setSeccion('menu'); setSubTabMenu('pedidos'); }}
                    className="gap-1 rounded-2xl border border-line bg-cream p-3.5"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-navy">Pedido #{pedido.id}</Text>
                      <Text className="text-xs font-semibold text-gold">{estadoPedidoLabel[pedido.estado]}</Text>
                    </View>
                    <Text className="text-xs text-muted">
                      {pedido.items.map(i => `${i.cantidad}× ${i.nombre}`).join(', ')}
                    </Text>
                    <Text className="text-xs font-semibold text-navy">{money(pedido.total)}</Text>
                  </Pressable>
                ))
              )}
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-navy">Tu habitación ahora</Text>
                <Pressable onPress={() => setSeccion('habitacion')}>
                  <Text className="text-xs font-semibold text-navy underline">Controlar</Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <View className="min-w-[45%] flex-1 rounded-xl border border-line bg-cream p-3">
                  <Text className="text-base font-bold text-navy">22°C</Text>
                  <Text className="text-xs text-muted">Temperatura</Text>
                </View>
                <View className="min-w-[45%] flex-1 rounded-xl border border-line bg-cream p-3">
                  <Text className="text-base font-bold text-navy">{wifi?.nombreRed ?? 'VillaSerena'}</Text>
                  <Text className="text-xs text-muted">Red Wi-Fi</Text>
                </View>
              </View>
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-navy">Reservas y experiencias</Text>
                <Pressable onPress={() => setSeccion('experiencias')}>
                  <Text className="text-xs font-semibold text-navy underline">Ver experiencias</Text>
                </Pressable>
              </View>
              <Text className="text-sm text-muted">
                Descubre el Spa, Restaurante Mirador, área de piscina y traslados del hotel ({amenidades.length || EXPERIENCIAS.length} opciones disponibles).
              </Text>
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <Text className="text-lg font-bold text-navy">Contactos del hotel</Text>
              {[
                { nombre: 'Recepción', detalle: 'Disponible 24 horas', ext: '100' },
                { nombre: 'Room Service', detalle: '6:00 a. m. – 11:00 p. m.', ext: '120' },
                { nombre: 'Emergencias', detalle: 'Atención prioritaria', ext: '110' },
              ].map(c => (
                <View key={c.ext} className="flex-row items-center justify-between rounded-2xl border border-line bg-cream px-4 py-3">
                  <View>
                    <Text className="text-sm font-bold text-navy">{c.nombre}</Text>
                    <Text className="text-xs text-muted">{c.detalle}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] uppercase tracking-widest text-muted">Extensión</Text>
                    <Text className="text-xl font-bold text-navy">{c.ext}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="gap-3">
              <Action label={active ? 'Mi cuenta y check-out' : 'Mi cuenta'} onPress={() => go('/cuenta')} />
              <Action label="Menú · Room Service" secondary onPress={() => setSeccion('menu')} />
              <Action label="Servicios · Limpieza y artículos" secondary onPress={() => setSeccion('servicios')} />
              <Action label="Chat con Recepción" secondary onPress={() => setSeccion('chat')} />
              <Action label="Gestionar estancia" secondary onPress={() => setSeccion('reservar')} />
              <Action label="Cerrar sesión" secondary onPress={() => { void cerrarSesion(); }} />
            </View>
          </>
        ) : null}

        {/* Pestaña: MENÚ (Room Service y Mis pedidos) */}
        {stay && seccion === 'menu' ? (
          <View className="gap-4">
            <View className="gap-2 rounded-3xl border border-line bg-white p-5">
              <Text className="text-xs uppercase tracking-widest text-gold">Restaurante Villa Serena</Text>
              <Text className="text-2xl font-bold text-navy">Menú y Room Service</Text>
              <Text className="text-sm text-muted">Disfruta los sabores de Villa Serena durante tu estancia.</Text>

              <View className="mt-2 flex-row gap-2">
                <Pressable
                  onPress={() => setSubTabMenu('catalogo')}
                  className={`flex-1 items-center rounded-xl py-2.5 ${subTabMenu === 'catalogo' ? 'bg-navy' : 'border border-line bg-cream'}`}
                >
                  <Text className={`text-xs font-bold ${subTabMenu === 'catalogo' ? 'text-white' : 'text-navy'}`}>Menú</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSubTabMenu('pedidos')}
                  className={`flex-1 items-center rounded-xl py-2.5 ${subTabMenu === 'pedidos' ? 'bg-navy' : 'border border-line bg-cream'}`}
                >
                  <Text className={`text-xs font-bold ${subTabMenu === 'pedidos' ? 'text-white' : 'text-navy'}`}>
                    Mis pedidos ({pedidos.length})
                  </Text>
                </Pressable>
              </View>
            </View>

            {!active ? (
              <Notice text="Puedes explorar todo el menú. Para enviar pedidos a tu habitación, tu reserva debe estar en estadía (con check-in realizado)." />
            ) : null}
            {avisoMenu ? <Notice text={avisoMenu} /> : null}

            {subTabMenu === 'catalogo' ? (
              <>
                {menu ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      <Pressable
                        onPress={() => setCatMenuId(null)}
                        className={`rounded-full border px-4 py-2 ${catMenuId === null ? 'border-navy bg-navy' : 'border-line bg-white'}`}
                      >
                        <Text className={`text-xs font-semibold ${catMenuId === null ? 'text-white' : 'text-navy'}`}>Todas</Text>
                      </Pressable>
                      {menu.categorias.map(cat => (
                        <Pressable
                          key={cat.id}
                          onPress={() => setCatMenuId(cat.id)}
                          className={`rounded-full border px-4 py-2 ${catMenuId === cat.id ? 'border-navy bg-navy' : 'border-line bg-white'}`}
                        >
                          <Text className={`text-xs font-semibold ${catMenuId === cat.id ? 'text-white' : 'text-navy'}`}>{cat.nombre}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <TextInput
                      value={busquedaMenu}
                      onChangeText={setBusquedaMenu}
                      placeholder="Buscar platillos y bebidas…"
                      placeholderTextColor="#6b7280"
                      className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-navy"
                    />

                    {menu.items
                      .filter(i => (catMenuId === null || i.categoriaId === catMenuId) && (!busquedaMenu.trim() || i.nombre.toLowerCase().includes(busquedaMenu.trim().toLowerCase())))
                      .map(item => (
                        <View key={item.id} className={`gap-2 rounded-3xl border border-line bg-white p-5 ${item.disponibilidad === 'AGOTADO' ? 'opacity-60' : ''}`}>
                          <View className="flex-row items-start justify-between gap-2">
                            <Text className="flex-1 text-base font-bold text-navy">{item.nombre}</Text>
                            <Text className="text-base font-bold text-navy">{money(item.precio)}</Text>
                          </View>
                          {item.descripcion ? <Text className="text-xs leading-5 text-muted">{item.descripcion}</Text> : null}
                          {item.disponibilidad === 'DISPONIBLE' ? (
                            <View className="mt-2 flex-row items-center gap-3">
                              <View className="flex-1">
                                <Action
                                  label="−"
                                  secondary
                                  disabled={enviandoPedido || !carrito[item.id]}
                                  onPress={() => setCarrito({ ...carrito, [item.id]: Math.max(0, (carrito[item.id] ?? 0) - 1) })}
                                />
                              </View>
                              <Text className="w-8 text-center text-base font-bold text-navy">{carrito[item.id] ?? 0}</Text>
                              <View className="flex-1">
                                <Action
                                  label="+"
                                  secondary
                                  disabled={enviandoPedido}
                                  onPress={() => setCarrito({ ...carrito, [item.id]: (carrito[item.id] ?? 0) + 1 })}
                                />
                              </View>
                            </View>
                          ) : (
                            <Text className="text-xs font-semibold text-muted">Agotado · No disponible</Text>
                          )}
                        </View>
                      ))}

                    <View className="gap-3 rounded-3xl border border-line bg-white p-5">
                      <Text className="text-lg font-bold text-navy">Tu pedido</Text>
                      {menu.items.filter(i => (carrito[i.id] ?? 0) > 0).map(i => (
                        <Text key={i.id} className="text-sm text-navy">
                          {carrito[i.id]}× {i.nombre} · {money(i.precio * (carrito[i.id] ?? 0))}
                        </Text>
                      ))}
                      <TextInput
                        value={notasPedido}
                        onChangeText={setNotasPedido}
                        maxLength={500}
                        multiline
                        placeholder="Notas para el pedido (opcional), ej. sin cebolla"
                        placeholderTextColor="#6b7280"
                        className="rounded-2xl border border-line bg-cream p-3.5 text-sm text-navy"
                      />
                      <Text className="text-xl font-bold text-navy">Total estimado: {money(totalMenu)}</Text>
                      <Action
                        label={enviandoPedido ? 'Enviando pedido…' : 'Confirmar pedido'}
                        disabled={enviandoPedido || totalMenu === 0 || !active}
                        onPress={() => { void handleCrearPedido(); }}
                      />
                    </View>
                  </>
                ) : (
                  <Loading label="Consultando menú…" />
                )}
              </>
            ) : (
              <View className="gap-3">
                {pedidos.length === 0 ? (
                  <View className="rounded-3xl border border-line bg-white p-5">
                    <Text className="text-sm text-muted">No hay pedidos registrados en esta estancia.</Text>
                  </View>
                ) : (
                  pedidos.map(p => (
                    <View key={p.id} className="gap-2 rounded-3xl border border-line bg-white p-5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-bold text-navy">Pedido #{p.id}</Text>
                        <Text className="text-xs font-bold text-gold">{estadoPedidoLabel[p.estado]}</Text>
                      </View>
                      <Text className="text-xs text-muted">{dateLabel(p.creadoEn)}</Text>
                      {p.items.map(i => (
                        <Text key={i.itemId} className="text-sm text-navy">
                          {i.cantidad}× {i.nombre} · {money(i.subtotal)}
                        </Text>
                      ))}
                      <Text className="text-base font-bold text-navy">Total: {money(p.total)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        ) : null}

        {/* Pestaña: SERVICIOS (Limpieza y artículos) */}
        {stay && seccion === 'servicios' ? (
          <View className="gap-4">
            <View className="gap-2 rounded-3xl border border-line bg-white p-5">
              <Text className="text-xs uppercase tracking-widest text-gold">Atención a la habitación</Text>
              <Text className="text-2xl font-bold text-navy">Servicios y limpieza</Text>
              <Text className="text-sm text-muted">Elige la atención y los artículos que necesitas durante tu estancia.</Text>

              <View className="mt-2 flex-row gap-2">
                <Pressable
                  onPress={() => setSubTabServ('solicitar')}
                  className={`flex-1 items-center rounded-xl py-2.5 ${subTabServ === 'solicitar' ? 'bg-navy' : 'border border-line bg-cream'}`}
                >
                  <Text className={`text-xs font-bold ${subTabServ === 'solicitar' ? 'text-white' : 'text-navy'}`}>Servicios</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSubTabServ('historial')}
                  className={`flex-1 items-center rounded-xl py-2.5 ${subTabServ === 'historial' ? 'bg-navy' : 'border border-line bg-cream'}`}
                >
                  <Text className={`text-xs font-bold ${subTabServ === 'historial' ? 'text-white' : 'text-navy'}`}>
                    Mis solicitudes ({solicitudes.length})
                  </Text>
                </Pressable>
              </View>
            </View>

            {!active ? (
              <Notice text="Las solicitudes de limpieza y artículos se habilitan durante tu estancia, después del check-in." />
            ) : null}
            {avisoServ ? <Notice text={avisoServ} /> : null}

            {subTabServ === 'solicitar' ? (
              <>
                <View className="gap-3 rounded-3xl border border-line bg-white p-5">
                  <Text className="text-lg font-bold text-navy">Solicitar limpieza de habitación</Text>
                  <TextInput
                    value={comentarioLimpieza}
                    onChangeText={setComentarioLimpieza}
                    maxLength={500}
                    multiline
                    placeholder="Comentario opcional, ej. después de las 2:00 p. m."
                    placeholderTextColor="#6b7280"
                    className="rounded-2xl border border-line bg-cream p-3.5 text-sm text-navy"
                  />
                  <Action
                    label={enviandoServ ? 'Enviando…' : 'Pedir limpieza'}
                    disabled={enviandoServ || !active}
                    onPress={() => { void handleLimpieza(); }}
                  />
                </View>

                <View className="gap-3 rounded-3xl border border-line bg-white p-5">
                  <Text className="text-lg font-bold text-navy">Artículos para tu habitación</Text>
                  {articulos.map(art => (
                    <View key={art.id} className="gap-2 rounded-2xl border border-line bg-cream p-4">
                      <Text className="text-sm font-bold text-navy">
                        {art.nombre} · Máximo {art.cantidadMaxima}
                      </Text>
                      <View className="flex-row items-center gap-3">
                        <View className="flex-1">
                          <Action
                            label="−"
                            secondary
                            disabled={enviandoServ || !cantArticulos[art.id]}
                            onPress={() => setCantArticulos({ ...cantArticulos, [art.id]: Math.max(0, (cantArticulos[art.id] ?? 0) - 1) })}
                          />
                        </View>
                        <Text className="w-8 text-center text-base font-bold text-navy">{cantArticulos[art.id] ?? 0}</Text>
                        <View className="flex-1">
                          <Action
                            label="+"
                            secondary
                            disabled={enviandoServ || (cantArticulos[art.id] ?? 0) >= art.cantidadMaxima}
                            onPress={() => setCantArticulos({ ...cantArticulos, [art.id]: (cantArticulos[art.id] ?? 0) + 1 })}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                  <Action
                    label={enviandoServ ? 'Enviando…' : 'Pedir artículos seleccionados'}
                    disabled={enviandoServ || !active || !Object.values(cantArticulos).some(c => c > 0)}
                    onPress={() => { void handleArticulos(); }}
                  />
                </View>
              </>
            ) : (
              <View className="gap-3">
                {solicitudes.length === 0 ? (
                  <View className="rounded-3xl border border-line bg-white p-5">
                    <Text className="text-sm text-muted">Todavía no tienes solicitudes registradas.</Text>
                  </View>
                ) : (
                  solicitudes.map(req => (
                    <View key={req.id} className="gap-2 rounded-3xl border border-line bg-white p-5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-bold text-navy">
                          {req.tipo === 'LIMPIEZA' ? 'Limpieza' : 'Artículos'} #{req.id}
                        </Text>
                        <Text className="text-xs font-bold text-gold">{estadoSolicitudLabel[req.estado]}</Text>
                      </View>
                      <Text className="text-xs text-muted">{dateLabel(req.creadaEn)}</Text>
                      <Text className="text-sm text-navy">{describirSolicitud(req)}</Text>
                      {req.comentario ? <Text className="text-xs text-muted">{req.comentario}</Text> : null}
                      {req.estado === 'PENDIENTE' ? (
                        <Action
                          label="Cancelar solicitud"
                          secondary
                          disabled={enviandoServ}
                          onPress={() => { void handleCancelarSolicitud(req.id); }}
                        />
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        ) : null}

        {/* Pestaña: CHECK-IN */}
        {stay && seccion === 'checkin' ? (
          <View className="gap-4">
            <View className="gap-2 rounded-3xl border border-line bg-white p-5">
              <Text className="text-xs uppercase tracking-widest text-gold">Registro del huésped</Text>
              <Text className="text-2xl font-bold text-navy">Check-in y documentos</Text>
              <Text className="text-sm text-muted">
                Reserva {stay.codigo} · {estadoReservaLabel[stay.estado]}
              </Text>
              <View className="mt-2 gap-1 rounded-2xl bg-cream p-4">
                <Text className="text-sm font-semibold text-navy">Titular: {perfil?.nombreCompleto ?? 'Huésped'}</Text>
                <Text className="text-xs text-muted">Correo: {perfil?.correo ?? '—'}</Text>
                <Text className="text-xs text-muted">
                  Documento: {perfil?.tipoDocumento ?? 'DPI/Pasaporte'} {perfil?.numeroDocumento ?? 'Registrado'}
                </Text>
                <Text className="text-xs text-muted">
                  Habitación: {stay.habitacion?.numero ?? 'Pendiente de asignación'} · {stay.tipoHabitacion.nombre}
                </Text>
              </View>
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <Text className="text-lg font-bold text-navy">Documentos enviados ({documentos.length}/10)</Text>
              <Text className="text-xs text-muted">
                Documentos privados de esta reserva revisados por Recepción.
              </Text>
              {documentos.length === 0 ? (
                <Notice text="No hay documentos enviados todavía. Puedes presentar tu identificación en Recepción o subirla desde el portal web." />
              ) : (
                documentos.map(doc => (
                  <View key={doc.id} className="gap-1 rounded-2xl border border-line bg-cream p-3.5">
                    <Text className="text-sm font-semibold text-navy">{doc.nombre}</Text>
                    <Text className="text-xs font-semibold text-gold">{doc.estado}</Text>
                    {doc.motivo ? <Text className="text-xs text-muted">{doc.motivo}</Text> : null}
                  </View>
                ))
              )}
              <Action label="Contactar a Recepción por chat" secondary onPress={() => setSeccion('chat')} />
            </View>
          </View>
        ) : null}

        {/* Pestaña: CHAT CON RECEPCIÓN */}
        {stay && seccion === 'chat' ? (
          <View className="gap-4">
            <View className="gap-2 rounded-3xl border border-line bg-white p-5">
              <Text className="text-2xl font-bold text-navy">Chat con Recepción</Text>
              <Text className="text-sm text-muted">Mensajes directos sobre tu estancia {stay.codigo}</Text>
              {!active ? (
                <Notice text="El envío de mensajes en el chat está disponible durante tu estancia, después del check-in." />
              ) : null}
              {avisoChat ? <Notice text={avisoChat} /> : null}

              <View className="mt-2 gap-2.5">
                {mensajes.length === 0 ? (
                  <Text className="py-4 text-center text-sm text-muted">No hay mensajes todavía.</Text>
                ) : (
                  mensajes.map(m => {
                    const propio = m.autor === 'HUESPED';
                    return (
                      <View
                        key={m.id}
                        className={`max-w-[88%] rounded-2xl p-3.5 ${propio ? 'self-end bg-navy' : 'self-start border border-line bg-cream'}`}
                      >
                        <Text className={`text-sm ${propio ? 'text-white' : 'text-navy'}`}>{m.texto}</Text>
                        <Text className={`mt-1 text-[10px] ${propio ? 'text-white/70' : 'text-muted'}`}>
                          {propio ? 'Tú' : 'Recepción'} · {m.creadoEn}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>

              {active ? (
                <View className="mt-3 gap-3">
                  <TextInput
                    value={mensajeTexto}
                    onChangeText={setMensajeTexto}
                    placeholder="Escribe un mensaje para Recepción…"
                    placeholderTextColor="#6b7280"
                    multiline
                    maxLength={2000}
                    className="min-h-[80px] rounded-2xl border border-line bg-cream p-3.5 text-sm text-navy"
                  />
                  <Action
                    label={enviandoChat ? 'Enviando mensaje…' : 'Enviar mensaje'}
                    disabled={enviandoChat || !mensajeTexto.trim()}
                    onPress={() => { void handleEnviarChat(); }}
                  />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Pestaña: MI HABITACIÓN */}
        {stay && seccion === 'habitacion' ? (
          <View className="gap-4">
            <View className="gap-2 rounded-3xl border border-line bg-white p-5">
              <Text className="text-xs uppercase tracking-widest text-gold">Tu alojamiento actual</Text>
              <Text className="text-2xl font-bold text-navy">
                Habitación {stay.habitacion?.numero ?? 'Pendiente de asignación'}
              </Text>
              <Text className="text-sm text-muted">{stay.tipoHabitacion.nombre}</Text>
            </View>

            <View className="gap-2 rounded-3xl border border-gold bg-white p-5">
              <Text className="text-lg font-bold text-navy">Wi-Fi para huéspedes</Text>
              <Text className="text-sm text-navy">
                Red: <Text className="font-bold">{wifi?.nombreRed ?? 'VillaSerena-Huespedes'}</Text>
              </Text>
              <Text className="text-sm text-navy">
                Contraseña: <Text className="font-bold">{wifi?.contrasena ?? 'Solicitar en Recepción'}</Text>
              </Text>
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <Text className="text-lg font-bold text-navy">Controles y servicios de habitación</Text>
              {[
                { titulo: 'Acceso a la habitación', estado: 'Solicita tu tarjeta o llave en Recepción' },
                { titulo: 'Temperatura y clima', estado: '22 °C · Control en habitación' },
                { titulo: 'Iluminación y cortinas', estado: 'Panel junto a la entrada' },
                { titulo: 'No molestar / Limpieza', estado: active ? 'Solicitudes activas desde la app' : 'Disponible tras el check-in' },
              ].map(ctrl => (
                <View key={ctrl.titulo} className="rounded-2xl border border-line bg-cream p-3.5">
                  <Text className="text-sm font-bold text-navy">{ctrl.titulo}</Text>
                  <Text className="mt-0.5 text-xs text-muted">{ctrl.estado}</Text>
                </View>
              ))}
              <Action label="Ir a Limpieza y artículos" onPress={() => setSeccion('servicios')} />
            </View>
          </View>
        ) : null}

        {/* Pestaña: RESERVAS Y EXPERIENCIAS */}
        {stay && seccion === 'experiencias' ? (
          <View className="gap-4">
            <View className="gap-2 rounded-3xl border border-line bg-white p-5">
              <Text className="text-xs uppercase tracking-widest text-gold">Reservas y experiencias</Text>
              <Text className="text-2xl font-bold text-navy">Elige una experiencia</Text>
              <Text className="text-sm text-muted">Haz de tu estancia una experiencia a tu medida.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2" contentContainerStyle={{ gap: 8 }}>
                {CATEGORIAS_EXP.map(cat => (
                  <Pressable
                    key={cat}
                    onPress={() => setCatExp(cat)}
                    className={`rounded-full border px-3.5 py-1.5 ${catExp === cat ? 'border-navy bg-navy' : 'border-line bg-cream'}`}
                  >
                    <Text className={`text-xs font-semibold ${catExp === cat ? 'text-white' : 'text-navy'}`}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {amenidades.length > 0 && catExp === 'Todos' ? (
              <View className="gap-3 rounded-3xl border border-line bg-white p-5">
                <Text className="text-lg font-bold text-navy">Amenidades del hotel</Text>
                {amenidades.map(am => (
                  <View key={am.id} className="gap-1 rounded-2xl border border-line bg-cream p-4">
                    <Text className="text-base font-bold text-navy">{am.nombre}</Text>
                    <Text className="text-xs text-muted">{am.descripcion}</Text>
                    <Text className="mt-1 text-xs font-semibold text-navy">
                      {am.horario} · {am.ubicacion}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {EXPERIENCIAS.filter(e => catExp === 'Todos' || e.categoria === catExp).map(exp => (
              <View key={exp.id} className="gap-2 rounded-3xl border border-line bg-white p-5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-bold uppercase tracking-widest text-gold">{exp.categoria}</Text>
                  <Text className="text-sm font-bold text-navy">{exp.precio}</Text>
                </View>
                <Text className="text-lg font-bold text-navy">{exp.nombre}</Text>
                <Text className="text-sm text-muted">{exp.descripcion}</Text>
                <Pressable onPress={() => setSeccion('chat')} className="mt-2 self-start rounded-xl border border-navy px-4 py-2">
                  <Text className="text-xs font-semibold text-navy">Coordinar con Recepción</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* Pestaña: CUENTA Y PAGOS */}
        {stay && seccion === 'cuenta' ? (
          <View className="gap-4">
            {avisoPago ? <Notice text={avisoPago} /> : null}

            <View className="gap-3 rounded-3xl border border-gold bg-sand p-6">
              <Text className="text-xs font-semibold uppercase tracking-widest text-gold">
                {cuenta?.estadoCuenta === 'CERRADA' ? 'Cuenta cerrada' : 'Estado de cuenta y pagos'}
              </Text>
              <Text className="text-sm text-muted">
                {cuenta && cuenta.saldo < 0 ? 'Saldo a tu favor' : 'Saldo pendiente de pago'}
              </Text>
              <Text className="text-4xl font-light text-navy">
                {cuenta ? money(Math.abs(cuenta.saldo)) : 'Consultando…'}
              </Text>
              {cuenta ? (
                <Text className="text-xs leading-5 text-muted">
                  Total de cargos vigentes: {money(cuenta.totalCargosVigentes)} · Pagos aprobados: {money(cuenta.totalPagosAprobados)} (IVA incluido).
                </Text>
              ) : null}

              {cuenta && cuenta.saldo > 0 && (stay.estado === 'PENDIENTE_PAGO' || stay.estado === 'EN_ESTADIA') ? (
                <View className="mt-2 gap-2 border-t border-line pt-3">
                  <Text className="text-xs leading-5 text-navy">
                    {stay.estado === 'PENDIENTE_PAGO'
                      ? 'Tu reserva está pendiente de pago. Paga ahora con tarjeta en Recurrente para confirmarla al instante (prueba: 4242 4242 4242 4242).'
                      : 'Paga tu saldo en línea con Recurrente para dejar tu cuenta en Q 0.00.'}
                  </Text>
                  <Action
                    label={pagando ? 'Abriendo pasarela Recurrente…' : `Pagar ahora con Recurrente · ${money(cuenta.saldo)}`}
                    disabled={pagando}
                    onPress={() => { void handlePagarRecurrente(); }}
                  />
                </View>
              ) : null}
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <Text className="text-lg font-bold text-navy">Cargos de tu estancia</Text>
              {!cuenta || cuenta.cargos.length === 0 ? (
                <Text className="text-sm text-muted">Todavía no hay cargos registrados.</Text>
              ) : (
                cuenta.cargos.map(charge => (
                  <View key={charge.id} className="gap-1 rounded-2xl border border-line bg-cream p-3.5">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className={`flex-1 text-sm font-semibold text-navy ${charge.estado === 'ANULADO' ? 'line-through' : ''}`}>
                        {charge.concepto}
                      </Text>
                      <Text className={`text-sm font-bold text-navy ${charge.estado === 'ANULADO' ? 'line-through' : ''}`}>
                        {money(charge.monto)}
                      </Text>
                    </View>
                    <Text className="text-xs text-muted">
                      {dateLabel(charge.fechaHora)}
                      {charge.cantidad !== 1 ? ` · ${charge.cantidad} × ${money(charge.precioUnitario)}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <Text className="text-lg font-bold text-navy">Pagos registrados</Text>
              {!cuenta || cuenta.pagos.length === 0 ? (
                <Text className="text-sm text-muted">Todavía no hay pagos registrados.</Text>
              ) : (
                cuenta.pagos.map(payment => (
                  <View key={payment.id} className="gap-1 rounded-2xl border border-line bg-cream p-3.5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-navy">{metodoPagoLabel[payment.metodo]}</Text>
                      <Text className="text-sm font-bold text-navy">{money(payment.monto)}</Text>
                    </View>
                    <Text className="text-xs text-muted">
                      {dateLabel(payment.fechaHora)} · {estadoPagoLabel[payment.estado]}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {stay.estado === 'EN_ESTADIA' ? (
              <Action
                label="Continuar al check-out digital y factura"
                onPress={() => router.push({ pathname: '/checkout', params: { codigo: stay.codigo } })}
              />
            ) : null}

            {cuenta?.facturaId ? (
              <Action
                label="Ver mi factura"
                secondary
                onPress={() => router.push({ pathname: '/factura', params: { codigo: stay.codigo } })}
              />
            ) : null}
          </View>
        ) : null}

        {/* Pestaña: GESTIONAR ESTANCIA */}
        {stay && seccion === 'reservar' ? (
          <View className="gap-4">
            <View className="gap-2 rounded-3xl border border-line bg-white p-5">
              <Text className="text-xs uppercase tracking-widest text-gold">Tu estancia, a tu ritmo</Text>
              <Text className="text-2xl font-bold text-navy">Gestionar estancia</Text>
              <Text className="text-sm text-muted">Elige qué deseas hacer con tu alojamiento.</Text>
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <Text className="text-lg font-bold text-navy">Extender mi estancia</Text>
              <Text className="text-sm text-muted">
                Conserva tu habitación actual y solicita noches adicionales a Recepción.
              </Text>
              <View className="rounded-2xl bg-cream p-3.5">
                <Text className="text-sm font-bold text-navy">
                  Habitación {stay.habitacion?.numero ?? 'Sin asignar'} · {stay.tipoHabitacion.nombre}
                </Text>
                <Text className="text-xs text-muted">Salida programada: {stay.salida}</Text>
              </View>
              <Action label="Solicitar extensión por Chat" onPress={() => setSeccion('chat')} />
            </View>

            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <Text className="text-lg font-bold text-navy">Cambiar o consultar mis reservas</Text>
              <Text className="text-sm text-muted">
                Revisa todas las reservas asociadas a tu cuenta de huésped o crea una nueva reserva desde la app.
              </Text>
              <Action label="Ver todas mis reservas" secondary onPress={() => router.push('/reservas')} />
              <Action label="Reservar otra habitación desde la app" onPress={() => router.push('/acceso')} />
            </View>
          </View>
        ) : null}

        {/* Pestaña: PERFIL DEL HUÉSPED */}
        {stay && seccion === 'perfil' ? (
          <View className="gap-4">
            <View className="gap-3 rounded-3xl border border-line bg-white p-5">
              <Text className="text-xs uppercase tracking-widest text-gold">Cuenta de huésped</Text>
              <Text className="text-2xl font-bold text-navy">{perfil?.nombreCompleto ?? 'Huésped Villa Serena'}</Text>
              <View className="gap-2 rounded-2xl bg-cream p-4">
                <Text className="text-xs uppercase text-muted">Correo electrónico</Text>
                <Text className="text-sm font-semibold text-navy">{perfil?.correo ?? '—'}</Text>
                <Text className="mt-2 text-xs uppercase text-muted">Teléfono</Text>
                <Text className="text-sm font-semibold text-navy">{perfil?.telefono ?? 'No registrado'}</Text>
                <Text className="mt-2 text-xs uppercase text-muted">Documento</Text>
                <Text className="text-sm font-semibold text-navy">
                  {perfil?.tipoDocumento ?? 'Documento'} · {perfil?.numeroDocumento ?? '—'}
                </Text>
                <Text className="mt-2 text-xs uppercase text-muted">Nacionalidad</Text>
                <Text className="text-sm font-semibold text-navy">{perfil?.nacionalidad ?? '—'}</Text>
              </View>
              <Action label="Cerrar sesión" secondary onPress={() => { void cerrarSesion(); }} />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
