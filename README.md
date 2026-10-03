# Villa Serena — App del huésped

Base Android de Carlos (OBJ-0F, parte 1). Expo SDK 54, Expo Router, TypeScript y NativeWind. Sigue la paleta azul/dorado/crema de la web. La app habla directamente con Spring; no usa el BFF ni los stores del navegador.

## Arranque

Node.js 22 LTS y pnpm. Desde esta carpeta:

```sh
pnpm install
cp .env.example .env
pnpm start
```

En Windows usa `copy .env.example .env`. Ajusta `EXPO_PUBLIC_API_URL` a la IP LAN de la computadora que ejecuta Spring (puerto 8080). En un teléfono físico, localhost apunta al teléfono. Android emulado usa `http://10.0.2.2:8080`.

Instala Expo Go **SDK 54 para Android** desde [expo.dev/go](https://expo.dev/go?sdkVersion=54&platform=android&device=true). Computadora y teléfono deben compartir Wi-Fi; escanea el QR. Permite los puertos de Metro (8081) y Spring (8080) en el firewall local. No necesitas Docker para ver la bienvenida. Para probar el API, levanta `villa-serena-infra` según su README y ejecuta Spring en `villa-serena-api`.

## Verificación

```sh
pnpm check
pnpm lint
pnpm test:api
pnpm exec expo install --check
pnpm exec expo export --platform android
```

En el teléfono verifica bienvenida → «Entrar con mi correo» → «En construcción» → volver. Comprueba legibilidad y navegación. La comprobación nativa queda pendiente hasta probarlo en Android.

`lib/api` exporta `checkApiHealth()`: consulta `/actuator/health` sin autenticación. Con Spring encendido también puedes abrir `http://<IP-LAN>:8080/actuator/health` desde el teléfono. Debe devolver `{"status":"UP"}`. No se agrega una pantalla de diagnóstico al flujo del huésped.

## Sesión y contrato pendiente

Los dos tokens se guardan juntos en expo-secure-store. Ante HTTP 401 el cliente realiza una única renovación y reintenta una vez; las peticiones simultáneas comparten la renovación. Si falla, borra la sesión, limpia la caché y vuelve a la bienvenida. No usa AsyncStorage ni registra tokens en consola.

**Todavía no hay openapi.yaml ni endpoint de autenticación en el API local.** El adaptador usa provisionalmente `POST /api/v1/auth/renovar`, cuerpo `{ refreshToken }` y respuesta `{ accessToken, refreshToken }`. Hay que ajustar estos campos al contrato aprobado antes de conectar el acceso real. No se presenta esta integración como probada.

Cuando Josué entregue el contrato, copia su `openapi.yaml` aprobado a la raíz y ejecuta `pnpm generate:api`. Están instalados openapi-typescript y openapi-fetch para esa conexión; no se inventa un contrato vacío.

## Siguiente bloque

OBJ-0F parte 2: expo-dev-client, expo-notifications, Firebase y EAS. Push requiere development build y credenciales del proyecto; Expo Go no basta. La configuración local ya está preparada; falta vincular Expo/Firebase y generar/probar el APK. Consulta docs/APK_Y_NOTIFICACIONES.md. OTP, reservas, pedidos y cuenta pertenecen a los objetivos posteriores.

La única variable pública es EXPO_PUBLIC_API_URL. No colocar secretos en EXPO_PUBLIC_*. `.env` y credenciales Firebase están ignorados. No marcar el avance como terminado hasta verificar los criterios del prompt y fusionar el PR.

## OBJ-4D — Cuenta y check-out de prueba

Desde la bienvenida toca **Ver cuenta de prueba**. También puedes ejecutar `pnpm web` y abrir `/cuenta`. Son pantallas de la app móvil; no se agregaron a `villa-serena-web`.

El ejemplo muestra Q 1,925.00 de cargos vigentes y Q 1,800.00 de pagos aprobados: saldo Q 125.00. El cargo anulado y el pago fallido no suman. La cuenta se recarga al volver a la pantalla o deslizar hacia abajo en Android.

Recorrido: cuenta → check-out → aceptar cancelación del pedido en preparación → pagar saldo (simulación) → simular confirmación → Consumidor Final o NIT válido → confirmar → resumen de factura. La hora simulada es el 8 de octubre de 2026 a las 10:00 de Guatemala. Todos los datos y operaciones simuladas están en `lib/mocks/cuenta.ts`; se reinician al recargar la app. Para inspeccionar los bloqueos cambia la fecha de salida, DEMO_NOW o el pedido a EN_CAMINO en ese archivo.

```sh
pnpm test:cuenta
```

La prueba cubre límites de horario, pedidos, NIT (incluido K), exclusión de cargos anulados y pagos no aprobados, pago pendiente y reintento sin doble cobro. La validación del NIT comprueba el dígito, no consulta el registro de contribuyentes.

**Pendiente de integración:** Stripe Checkout con `expo-web-browser`, retorno villaserena://, consulta del saldo tras webhook, autorización del huésped, check-out transaccional y URL del PDF/correo. El botón de PDF está deshabilitado en los datos de prueba porque aún no existe una factura del servidor. No se han marcado estas tareas como completadas en el documento 17.

## Development build preparado

Los perfiles development y preview generan APK Android. La pantalla de prueba de notificaciones está disponible desde la bienvenida y explica cuándo necesitas el APK. Sigue [APK y notificaciones](docs/APK_Y_NOTIFICACIONES.md) para vincular tus cuentas y ejecutar el build. Antes de hacerlo, usa `node scripts/verificar-build.cjs`.

## Android Studio

Proyecto Android generado localmente. Sigue [Instalación con Android Studio](docs/ANDROID_STUDIO.md) para abrirlo, seleccionar JDK 17 y ejecutar en el Pixel_7 o teléfono USB. Firebase no es necesario para probar las pantallas; sí para el push real.

## Acceso y estadía de demostración

Entrar con mi correo → `ana@example.com` → código `123456` → estadía activa. Puedes revisar el selector de reservas y cerrar la sesión de prueba. El formulario muestra mensajes de código vencido/usado y bloqueo tras cinco intentos. No envía correo, no emite JWT y no sustituye la autenticación del servidor. El detalle de la estadía y la reserva futura usan datos locales. Las pantallas de Room Service y solicitudes usan datos de prueba. Su conexión con las áreas operativas y tiempo real sigue pendiente.

Ejecuta `pnpm test:acceso` para verificar el simulador. La conexión real espera OpenAPI, seguridad y Outbox del equipo.

El menú permite cantidades y notas, muestra agotados y crea pedidos locales sin sumar cargos hasta su entrega. Las solicitudes permiten pedir limpieza, artículos con máximos y cancelar pendientes. Prueba las reglas con `pnpm test:servicios`. Estos datos no se sincronizan con la web, no se persisten y no generan push.
