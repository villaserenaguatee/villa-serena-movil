import { useCallback, useState, useSyncExternalStore } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Image, Text } from 'react-native';
import { Action, dateLabel, useCarga } from '../../components/cuenta';
import { Campo, Card, PersonalPage, useAccion } from '../../components/personal';
import { incidenciaPersonal, resolverIncidencia, tomarIncidencia } from '../../lib/api/personal';
import { sessionSnapshot, subscribeSession } from '../../lib/sesion';

export default function IncidenciaPersonal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const empleado = useSyncExternalStore(subscribeSession, sessionSnapshot, () => null)?.empleado;
  const carga = useCarga(useCallback(() => incidenciaPersonal(Number(id)), [id]));
  const accion = useAccion(carga.reload);
  const [solucion, setSolucion] = useState('');
  const i = carga.data;
  const disabled = accion.busy || carga.refreshing || !!carga.error;
  return <PersonalPage title={`Incidencia #${id}`} error={accion.error || carga.error} refreshing={carga.refreshing} reload={carga.reload}>
    {i && <>
      <Card>
        <Text className="text-xl text-navy">Hab. {i.habitacion.numero} · Piso {i.habitacion.piso}</Text>
        <Text className="font-semibold text-navy">{i.estado === 'REPORTADA' ? 'Reportada' : i.estado === 'EN_PROCESO' ? 'En proceso' : 'Resuelta'}</Text>
        <Text className="text-navy">{i.descripcion}</Text>
        <Text className="text-muted">{dateLabel(i.reportadaEn)} · {i.reportadaPor.nombre}</Text>
        {i.impideUso && <Text className="font-semibold text-navy">Impide uso · {i.habitacionOcupada ? 'Habitación ocupada' : 'Habitación libre'}</Text>}
        {i.tecnicoACargo && <Text className="text-navy">A cargo: {i.tecnicoACargo.nombre}</Text>}
        {i.fotoUrl && <Image source={{ uri: i.fotoUrl }} accessibilityLabel="Foto de la incidencia" resizeMode="contain" style={{ width: '100%', height: 240 }} />}
        {i.solucion && <Text className="text-navy">Solución: {i.solucion}</Text>}
      </Card>
      {i.estado === 'REPORTADA' && <Action label="Tomar incidencia" disabled={disabled} onPress={() => { void accion.run(() => tomarIncidencia(i.id)); }} />}
      {i.estado === 'EN_PROCESO' && i.tecnicoACargo?.id === empleado?.id && <>
        <Campo label="Solución realizada" value={solucion} onChange={setSolucion} multiline />
        <Action label="Resolver incidencia" disabled={disabled || !solucion.trim()} onPress={() => { void accion.run(() => resolverIncidencia(i.id, solucion)); }} />
      </>}
      <Text className="text-xl text-navy">Historial</Text>
      {i.historial.map((h, n) => <Text key={n} className="text-muted">{dateLabel(h.fechaHora)} · {h.estadoNuevo} · {h.responsable}{h.motivo ? ` · ${h.motivo}` : ''}</Text>)}
    </>}
  </PersonalPage>;
}
