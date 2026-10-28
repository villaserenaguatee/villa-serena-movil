import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import { Alert, Image, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Action, Notice, useCarga } from '../../components/cuenta';
import { Campo, Card, PersonalPage, useAccion } from '../../components/personal';
import { habitacionesIncidencias, puedeMantenimiento, subirFotoIncidencia } from '../../lib/api/personal';
import { sessionSnapshot, subscribeSession } from '../../lib/sesion';
import { enviarReporte, leerReportePendiente } from '../../lib/personal/reporte';

export default function ReportarIncidencia() {
  const empleado = useSyncExternalStore(subscribeSession, sessionSnapshot, () => null)?.empleado;
  const empleadoId = empleado?.id;
  const carga = useCarga(useCallback(async () => {
    if (!empleadoId) throw new Error('Inicia sesión como personal.');
    return { habitaciones: await habitacionesIncidencias(), pendiente: await leerReportePendiente(empleadoId) };
  }, [empleadoId]));
  const accion = useAccion(carga.reload);
  const [habitacionId, setHabitacionId] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState(''), [impideUso, setImpideUso] = useState(false);
  const [foto, setFoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fotoClave, setFotoClave] = useState<string | undefined>();
  const pendiente = carga.data?.pendiente;
  useEffect(() => {
    if (!pendiente) return;
    setHabitacionId(pendiente.body.habitacionId); setDescripcion(pendiente.body.descripcion);
    setImpideUso(pendiente.body.impideUso); setFotoClave(pendiente.body.fotoClave); setFoto(null);
  }, [pendiente]);
  async function seleccionarFoto(camara: boolean) {
    await accion.run(async () => {
      if (camara && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Autoriza la cámara para tomar la foto o elige una imagen de la galería.');
      const opciones = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.8, allowsEditing: true };
      const result = camara ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
      if (!result.canceled) {
        const asset = result.assets[0];
        if (!['image/jpeg', 'image/png'].includes(asset.mimeType ?? '') || (asset.fileSize ?? 0) > 5 * 1024 * 1024) throw new Error('Selecciona una foto JPG o PNG de hasta 5 MiB.');
        setFoto(asset); setFotoClave(undefined);
      }
    });
  }
  return <PersonalPage title="Reportar incidencia" error={accion.error || carga.error} refreshing={carga.refreshing} reload={carga.reload}>
    {pendiente ? <Card>
      <Notice text="Hay un reporte cuyo resultado debe confirmarse. Reenviaremos los mismos datos y referencia, sin crear un segundo reporte." />
      <Text className="text-navy">Habitación {carga.data?.habitaciones.find(h => h.id === pendiente.body.habitacionId)?.numero ?? pendiente.body.habitacionId}</Text>
      <Text className="text-navy">{pendiente.body.descripcion}</Text>
      <Text className="text-muted">{pendiente.body.impideUso ? 'Impide el uso' : 'No impide el uso'}</Text>
    </Card> : <>
      <Text className="font-semibold text-navy">Habitación</Text>
      {carga.data?.habitaciones.map(h => <Action key={h.id} label={`Hab. ${h.numero} · Piso ${h.piso}${habitacionId === h.id ? ' · seleccionada' : ''}`} secondary={habitacionId !== h.id} disabled={accion.busy} onPress={() => setHabitacionId(h.id)} />)}
      <Campo label="Descripción del daño" value={descripcion} onChange={setDescripcion} multiline disabled={accion.busy} />
      <View className="flex-row items-center justify-between"><Text className="text-navy">¿Impide usar la habitación?</Text><Switch accessibilityLabel="Impide usar la habitación" value={impideUso} onValueChange={setImpideUso} disabled={accion.busy} /></View>
      <Action label="Tomar foto (opcional)" secondary disabled={accion.busy} onPress={() => { void seleccionarFoto(true); }} />
      <Action label="Elegir foto (opcional)" secondary disabled={accion.busy} onPress={() => { void seleccionarFoto(false); }} />
      {foto && <><Image source={{ uri: foto.uri }} accessibilityLabel="Foto seleccionada de la incidencia" resizeMode="contain" style={{ width: '100%', height: 220 }} /><Action label="Quitar foto" secondary disabled={accion.busy} onPress={() => setFoto(null)} /></>}
      {fotoClave && <><Text className="text-muted">Foto privada ya subida para este reporte.</Text><Action label="Quitar asociación de foto" secondary disabled={accion.busy} onPress={() => setFotoClave(undefined)} /></>}
    </>}
    <Action label={accion.busy ? 'Guardando…' : pendiente ? 'Confirmar reporte pendiente' : 'Guardar reporte'} disabled={accion.busy || carga.refreshing || !!carga.error || (!pendiente && (!habitacionId || !descripcion.trim()))} onPress={() => { void accion.run(async () => {
      const clave = pendiente ? pendiente.body.fotoClave : foto ? await subirFotoIncidencia(foto) : fotoClave;
      if (clave) { setFotoClave(clave); setFoto(null); }
      const body = pendiente?.body ?? { habitacionId: habitacionId!, descripcion, impideUso, ...(clave ? { fotoClave: clave } : {}) };
      const resultado = await enviarReporte(body);
      if (empleado && puedeMantenimiento(empleado)) router.replace({ pathname: '/personal/incidencia', params: { id: resultado.id } });
      else { Alert.alert('Incidencia registrada', `Reporte #${resultado.id} enviado a Mantenimiento.`); router.replace('/personal'); }
    }); }} />
  </PersonalPage>;
}
