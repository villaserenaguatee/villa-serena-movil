import { useState } from 'react';
import { router } from 'expo-router';
import { Action } from '../components/cuenta';
import { Campo, PersonalPage, useAccion } from '../components/personal';
import { iniciarPersonal } from '../lib/api/personal';

export default function AccesoPersonal() {
  const [correo, setCorreo] = useState(''), [contrasena, setContrasena] = useState('');
  const accion = useAccion();
  return <PersonalPage title="Personal del hotel" error={accion.error}>
    <Campo label="Correo laboral" value={correo} onChange={setCorreo} maxLength={150} disabled={accion.busy} />
    <Campo label="Contraseña" value={contrasena} onChange={setContrasena} maxLength={200} secret disabled={accion.busy} />
    <Action label={accion.busy ? 'Ingresando…' : 'Entrar'} disabled={accion.busy || !correo.trim() || !contrasena} onPress={() => { void accion.run(async () => {
      const empleado = await iniciarPersonal(correo, contrasena);
      setContrasena('');
      router.replace(empleado.debeCambiarContrasena ? '/personal/contrasena' : '/personal');
    }); }} />
  </PersonalPage>;
}
