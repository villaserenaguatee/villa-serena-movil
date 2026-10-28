import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { z } from 'zod';
import { ApiError, type Schemas } from '../api';
import { reportarIncidencia } from '../api/personal';
import { readSession } from '../sesion';

const intentoSchema = z.object({ clave: z.string().uuid(), body: z.object({ habitacionId: z.number().int().positive(), descripcion: z.string().min(1).max(2000), impideUso: z.boolean(), fotoClave: z.string().min(1).max(255).optional() }) });
export type ReportePendiente = z.infer<typeof intentoSchema>;
function key(empleadoId: number) { return `villaserena.reporte.${empleadoId}`; }
export async function leerReportePendiente(empleadoId: number): Promise<ReportePendiente | null> {
  const raw = await SecureStore.getItemAsync(key(empleadoId));
  if (!raw) return null;
  try { return intentoSchema.parse(JSON.parse(raw)); }
  catch { throw new Error('No se pudo recuperar el reporte pendiente. Conserva los datos y solicita asistencia antes de crear otro.'); }
}
// Guardar referencia y datos antes del POST permite recuperar un envío incierto tras reiniciar.
export async function enviarReporte(body: Schemas['ReportarIncidenciaPeticion']) {
  const session = await readSession();
  if (session?.empleado?.rol !== 'MANTENIMIENTO_LIMPIEZA') throw new ApiError(403, 'ACCESO_DENEGADO', 'Inicia sesión como personal de piso.');
  const storageKey = key(session.empleado.id);
  const bodyNormalizado = { ...body, descripcion: body.descripcion.trim() };
  let intento = await leerReportePendiente(session.empleado.id);
  if (intento && JSON.stringify(intento.body) !== JSON.stringify(bodyNormalizado)) throw new ApiError(409, 'REPORTE_PENDIENTE', 'Primero confirma el resultado del reporte pendiente.');
  if (!intento) {
    intento = intentoSchema.parse({ clave: randomUUID(), body: bodyNormalizado });
    await SecureStore.setItemAsync(storageKey, JSON.stringify(intento));
  }
  try {
    const resultado = await reportarIncidencia(intento.body, intento.clave);
    await SecureStore.deleteItemAsync(storageKey);
    return resultado;
  } catch (cause) {
    // Un 400 confirma rechazo de validación; resultados inciertos conservan la referencia.
    if (cause instanceof ApiError && cause.status === 400) await SecureStore.deleteItemAsync(storageKey);
    throw cause;
  }
}
