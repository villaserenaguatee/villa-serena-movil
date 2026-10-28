import { useCallback, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { Action, dateLabel, useCarga } from '../../components/cuenta';
import { Card, PersonalPage, useAccion } from '../../components/personal';
import { cambiarLimpieza, cambiarSolicitud, habitacionesLimpieza, solicitudesPersonal, verificarPersonal } from '../../lib/api/personal';
import { sessionSnapshot, subscribeSession } from '../../lib/sesion';
import { suscribirPersonal } from '../../lib/tiempo-real';

export default function LimpiezaPersonal() {
  const empleado = useSyncExternalStore(subscribeSession, sessionSnapshot, () => null)?.empleado;
  const carga = useCarga(useCallback(async () => ({ habitaciones: await habitacionesLimpieza(), solicitudes: await solicitudesPersonal() }), []));
  const accion = useAccion(carga.reload);
  const [tab, setTab] = useState<'habitaciones' | 'solicitudes'>('habitaciones');
  useFocusEffect(useCallback(() => {
    let disposed = false, cleanup = () => {};
    void verificarPersonal().then(e => { if (!disposed) cleanup = suscribirPersonal(e, carga.reload, () => {}); }).catch(() => undefined);
    return () => { disposed = true; cleanup(); };
  }, [carga.reload]));
  const disabled = accion.busy || carga.refreshing || !!carga.error;
  return <PersonalPage title="Limpieza" error={accion.error || carga.error} refreshing={carga.refreshing} reload={carga.reload}>
    <View className="flex-row gap-3"><Action label="Habitaciones" secondary={tab !== 'habitaciones'} onPress={() => setTab('habitaciones')} /><Action label="Solicitudes" secondary={tab !== 'solicitudes'} onPress={() => setTab('solicitudes')} /></View>
    {tab === 'habitaciones' ? <>
      {carga.data?.habitaciones.length === 0 && <Text className="text-navy">No hay habitaciones pendientes de limpieza.</Text>}
      {carga.data?.habitaciones.map(h => <Card key={h.habitacion.id}>
        <Text className="text-xl font-semibold text-navy">Hab. {h.habitacion.numero} · Piso {h.habitacion.piso}</Text>
        <Text className="text-navy">{h.condicion === 'SUCIA' ? 'Sucia' : 'En limpieza'}</Text>
        {h.llegadaHoy && <Text className="font-semibold text-navy">Prioridad: llegada hoy</Text>}
        <Text className="text-muted">Sucia desde {dateLabel(h.suciaDesde)}</Text>
        {h.empleadoACargo && <Text className="text-navy">A cargo: {h.empleadoACargo.nombre}</Text>}
        {h.condicion === 'SUCIA' ? <Action label="Iniciar limpieza" disabled={disabled} onPress={() => { void accion.run(() => cambiarLimpieza(h.habitacion.id, 'iniciar')); }} /> : h.empleadoACargo?.id === empleado?.id ? <>
          <Action label="Terminar limpieza" disabled={disabled} onPress={() => { void accion.run(() => cambiarLimpieza(h.habitacion.id, 'terminar')); }} />
          <Action label="Interrumpir limpieza" secondary disabled={disabled} onPress={() => { void accion.run(() => cambiarLimpieza(h.habitacion.id, 'interrumpir')); }} />
        </> : null}
      </Card>)}
    </> : <>
      {carga.data?.solicitudes.length === 0 && <Text className="text-navy">No hay solicitudes pendientes.</Text>}
      {carga.data?.solicitudes.map(s => <Card key={s.id}>
        <Text className="text-xl text-navy">#{s.id} · Hab. {s.habitacion.numero} · Piso {s.habitacion.piso}</Text>
        <Text className="font-semibold text-navy">{s.tipo === 'LIMPIEZA' ? 'Limpieza' : 'Artículos'} · {s.estado === 'PENDIENTE' ? 'Pendiente' : 'En proceso'}</Text>
        <Text className="text-muted">{dateLabel(s.creadaEn)}</Text>
        {s.comentario && <Text className="text-navy">{s.comentario}</Text>}
        {s.articulos.map(a => <Text key={a.articuloId} className="text-navy">{a.cantidad} × {a.nombre}</Text>)}
        {s.empleadoACargo && <Text className="text-navy">A cargo: {s.empleadoACargo.nombre}</Text>}
        {s.estado === 'PENDIENTE' ? <Action label="Tomar solicitud" disabled={disabled} onPress={() => { void accion.run(() => cambiarSolicitud(s.id, 'tomar')); }} /> : s.estado === 'EN_PROCESO' && s.empleadoACargo?.id === empleado?.id ? <Action label="Marcar atendida" disabled={disabled} onPress={() => { void accion.run(() => cambiarSolicitud(s.id, 'atender')); }} /> : null}
      </Card>)}
    </>}
  </PersonalPage>;
}
