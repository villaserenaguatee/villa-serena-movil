import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { cambiarContrasenaPersonal, cerrarPersonal } from '../../lib/api/personal';
import { Action } from '../../components/cuenta';
import { Campo, PersonalPage, useAccion } from '../../components/personal';

export default function ContrasenaPersonal() {
  const [actual, setActual] = useState(''), [nueva, setNueva] = useState(''), [confirmacion, setConfirmacion] = useState('');
  const accion = useAccion();
  return <PersonalPage title="Cambiar contraseña" error={accion.error}>
    <Text className="text-muted">La contraseña temporal debe cambiarse antes de operar. Usa al menos 8 caracteres, una letra y un número, distintos de la anterior.</Text>
    <Campo label="Contraseña actual" value={actual} onChange={setActual} secret maxLength={200} />
    <Campo label="Nueva contraseña" value={nueva} onChange={setNueva} secret maxLength={200} />
    <Campo label="Confirmar contraseña" value={confirmacion} onChange={setConfirmacion} secret maxLength={200} />
    <Action label="Guardar contraseña" disabled={accion.busy || !actual || nueva.length < 8 || nueva !== confirmacion} onPress={() => { void accion.run(async () => {
      const empleado = await cambiarContrasenaPersonal({ contrasenaActual: actual, contrasenaNueva: nueva, confirmacion });
      if (empleado.debeCambiarContrasena) throw new Error('El servidor aún requiere cambiar la contraseña.');
      setActual(''); setNueva(''); setConfirmacion(''); router.replace('/personal');
    }); }} />
    <Action label="Cerrar sesión" secondary disabled={accion.busy} onPress={() => { void accion.run(cerrarPersonal); }} />
  </PersonalPage>;
}
