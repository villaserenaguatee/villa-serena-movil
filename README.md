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
pnpm check:api --docs-dir ../villa-serena-docs
pnpm test:api
pnpm test:acceso
pnpm exec expo install --check
pnpm exec expo export --platform android
```

En el teléfono verifica bienvenida → «Entrar con mi correo» → «En construcción» → volver. Comprueba legibilidad y navegación. La comprobación nativa queda pendiente hasta probarlo en Android.

`lib/api` exporta `checkApiHealth()`: consulta `/actuator/health` sin autenticación. Con Spring encendido también puedes abrir `http://<IP-LAN>:8080/actuator/health` desde el teléfono. Debe devolver `{"status":"UP"}`. No se agrega una pantalla de diagnóstico al flujo del huésped.

## Sesión y contrato del API

Los tipos se generan desde el contrato canónico de villa-serena-docs, en el commit fijado por `api-contract.json`; la app no guarda copia de `openapi.yaml`. Sigue [Contrato del API](docs/CONTRATO_API.md) para `pnpm generate:api` y `pnpm check:api`.

Los dos tokens se guardan juntos en expo-secure-store. Ante HTTP 401 el cliente realiza una única renovación con `POST /api/v1/auth/renovar` y reintenta una vez; las peticiones simultáneas comparten la renovación. Si falla, borra la sesión, limpia la caché y vuelve a la bienvenida. No usa AsyncStorage ni registra tokens en consola.

## Siguiente bloque

OBJ-0F parte 2: expo-dev-client, expo-notifications, Firebase y EAS. Push requiere development build y credenciales del proyecto; Expo Go no basta. La configuración local ya está preparada; falta vincular Expo/Firebase y generar/probar el APK. Consulta docs/APK_Y_NOTIFICACIONES.md. OTP, reservas, pedidos y cuenta pertenecen a los objetivos posteriores.

La única variable pública es EXPO_PUBLIC_API_URL. No colocar secretos en EXPO_PUBLIC_*. `.env` y credenciales Firebase están ignorados. No marcar el avance como terminado hasta verificar los criterios del prompt y fusionar el PR.

## Cuenta (HU-HUE-15)

Desde la estadía, «Mi cuenta» consulta `GET /api/v1/app/reservas/{codigo}/cuenta` en cualquier estado de la reserva. Muestra cargos con fecha y monto en quetzales (IVA incluido), los anulados tachados con su motivo, los pagos con método y estado, y el saldo que calcula el servidor: cargos vigentes menos pagos aprobados. Es de solo lectura; se recarga al volver a la pantalla o al deslizar hacia abajo. Una reserva ajena muestra el error del API.

## Check-out de prueba

El check-out todavía usa datos locales de `lib/mocks/cuenta.ts`. La hora simulada es el 8 de octubre de 2026 a las 10:00 de Guatemala.

```sh
pnpm test:cuenta
```

La prueba cubre límites de horario, pedidos, NIT (incluido K), exclusión de cargos anulados y pagos no aprobados, pago pendiente y reintento sin doble cobro. La validación del NIT comprueba el dígito, no consulta el registro de contribuyentes.

**Pendiente de integración:** Stripe Checkout con `expo-web-browser`, retorno villaserena://, consulta del saldo tras webhook, autorización del huésped, check-out transaccional y URL del PDF/correo. El botón de PDF está deshabilitado en los datos de prueba porque aún no existe una factura del servidor. No se han marcado estas tareas como completadas en el documento 17.

## Development build preparado

Los perfiles development y preview generan APK Android. La pantalla de prueba de notificaciones está disponible desde la bienvenida y explica cuándo necesitas el APK. Sigue [APK y notificaciones](docs/APK_Y_NOTIFICACIONES.md) para vincular tus cuentas y ejecutar el build. Antes de hacerlo, usa `node scripts/verificar-build.cjs`.

## Android Studio

Proyecto Android generado localmente. Sigue [Instalación con Android Studio](docs/ANDROID_STUDIO.md) para abrirlo, seleccionar JDK 17 y ejecutar en el Pixel_7 o teléfono USB. Firebase no es necesario para probar las pantallas; sí para el push real.

## Acceso y estadía (HU-HUE-08, HU-HUE-09)

Entrar con mi correo → código de seis dígitos enviado por correo (con el entorno local llega a Mailpit) → si hay una reserva `EN_ESTADIA` se abre su detalle; si no, el selector de reservas. Los mensajes de código inválido, vencido o bloqueo los define el API. «Cerrar sesión» revoca el refresh en el servidor y borra los tokens aunque no haya red. Requiere Spring con las rutas `/api/v1/app/*` y `EXPO_PUBLIC_API_URL` configurada.

Ejecuta `pnpm test:acceso` para probar el cliente con un servidor simulado. La prueba conectada contra Spring y Mailpit se registra aparte.

Check-out, Room Service, pedidos y solicitudes siguen con datos de prueba hasta sus issues.

El menú permite cantidades y notas, muestra agotados y crea pedidos locales sin sumar cargos hasta su entrega. Las solicitudes permiten pedir limpieza, artículos con máximos y cancelar pendientes. Prueba las reglas con `pnpm test:servicios`. Estos datos no se sincronizan con la web, no se persisten y no generan push.
