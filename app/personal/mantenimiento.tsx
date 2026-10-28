import { useCallback } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Action, dateLabel, useCarga } from '../../components/cuenta';
import { Card, PersonalPage } from '../../components/personal';
import { incidenciasPersonal } from '../../lib/api/personal';

export default function MantenimientoPersonal() {
  const carga = useCarga(useCallback(incidenciasPersonal, []));
  return <PersonalPage title="Incidencias activas" error={carga.error} refreshing={carga.refreshing} reload={carga.reload}>
    <Action label="Reportar incidencia" onPress={() => router.push('/personal/reportar')} />
    {carga.data?.length === 0 && <Text className="text-navy">No hay incidencias activas.</Text>}
    {carga.data?.map(i => <Card key={i.id}>
      <Text className="text-xl text-navy">#{i.id} · Hab. {i.habitacion.numero} · Piso {i.habitacion.piso}</Text>
      <Text className="font-semibold text-navy">{i.estado === 'REPORTADA' ? 'Reportada' : i.estado === 'EN_PROCESO' ? 'En proceso' : 'Resuelta'}</Text>
      <Text className="text-navy">{i.descripcion}</Text>
      {i.impideUso && <Text className="font-semibold text-navy">Impide usar la habitación{i.habitacionOcupada ? ' · ocupada' : ''}</Text>}
      <Text className="text-muted">{dateLabel(i.reportadaEn)} · {i.reportadaPor.nombre}</Text>
      {i.tecnicoACargo && <Text className="text-navy">A cargo: {i.tecnicoACargo.nombre}</Text>}
      <Action label="Ver incidencia" secondary onPress={() => router.push({ pathname: '/personal/incidencia', params: { id: i.id } })} />
    </Card>)}
  </PersonalPage>;
}
