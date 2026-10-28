import { useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { sessionSnapshot, subscribeSession } from '../../lib/sesion';
import { cerrarPersonal, puedeLimpieza, puedeMantenimiento } from '../../lib/api/personal';
import { Action } from '../../components/cuenta';
import { PersonalPage, useAccion } from '../../components/personal';

export default function Personal() {
  const empleado = useSyncExternalStore(subscribeSession, sessionSnapshot, () => null)?.empleado;
  const accion = useAccion();
  if (!empleado) return null;
  return <PersonalPage title="Mi operación" error={accion.error}>
    <Text className="text-xl text-navy">{empleado.nombre}</Text>
    <Text className="text-muted">{empleado.rol === 'ROOM_SERVICE' ? 'Room Service' : `Mantenimiento y Limpieza · ${empleado.area}`}</Text>
    {empleado.rol === 'ROOM_SERVICE' && <Action label="Pedidos y menú" onPress={() => router.push('/personal/room-service')} />}
    {puedeLimpieza(empleado) && <Action label="Habitaciones y solicitudes" onPress={() => router.push('/personal/limpieza')} />}
    {puedeMantenimiento(empleado) && <Action label="Incidencias de mantenimiento" onPress={() => router.push('/personal/mantenimiento')} />}
    {empleado.rol === 'MANTENIMIENTO_LIMPIEZA' && <Action label="Reportar una incidencia" secondary onPress={() => router.push('/personal/reportar')} />}
    <Action label="Cambiar mi contraseña" secondary onPress={() => router.push('/personal/contrasena')} />
    <Action label="Cerrar sesión" secondary disabled={accion.busy} onPress={() => { void accion.run(cerrarPersonal); }} />
  </PersonalPage>;
}
