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

## Pago del saldo, check-out y factura (HU-HUE-16)

«Continuar al check-out» consulta `GET .../checkout`: el servidor informa saldo, bloqueos (fuera de la ventana de 00:00 a 12:00 del día de salida en Guatemala, pedido `EN_CAMINO`) y pedidos `NUEVO` o `EN_PREPARACION` que se cancelarán sin cargo; para confirmar se pide aceptar esa cancelación.

Con saldo positivo, la acción de `GET .../pago-saldo/estado` decide el botón: iniciar o reintentar (`POST .../pago-saldo`), continuar un pago abierto o esperar la verificación. La pasarela de Recurrente (GTQ) se abre con `expo-web-browser` y vuelve a `villaserena://checkout`; el regreso no acredita el pago, la app consulta el estado hasta que el servidor lo confirme. El API debe configurar `APP_URL_RETORNO` con esa URL (en Expo Go, `Linking.createURL('checkout')` produce una URL `exp://`).

Con saldo Q 0.00 se elige «Consumidor Final» o un NIT validado con su dígito verificador (admite K) y se confirma con `POST .../checkout`. La factura muestra serie, número, receptor, cargos y total, y abre el PDF con el enlace temporal de `GET /api/v1/facturas/{id}/pdf`. Tras finalizar, Room Service y solicitudes quedan deshabilitados por el estado de la reserva.

```sh
pnpm test:cuenta
```

La prueba cubre el NIT, el pago con retorno a la app, la espera de acreditación, saldo cero, consentimiento, check-out y PDF con un servidor simulado. La validación del NIT comprueba el dígito, no consulta el registro de contribuyentes.

## Development build preparado

Los perfiles development y preview generan APK Android. La pantalla de prueba de notificaciones está disponible desde la bienvenida y explica cuándo necesitas el APK. Sigue [APK y notificaciones](docs/APK_Y_NOTIFICACIONES.md) para vincular tus cuentas y ejecutar el build. Antes de hacerlo, usa `node scripts/verificar-build.cjs`.

## Android Studio

Proyecto Android generado localmente. Sigue [Instalación con Android Studio](docs/ANDROID_STUDIO.md) para abrirlo, seleccionar JDK 17 y ejecutar en el Pixel_7 o teléfono USB. Firebase no es necesario para probar las pantallas; sí para el push real.

## Acceso y estadía (HU-HUE-08, HU-HUE-09)

Entrar con mi correo → código de seis dígitos enviado por correo (con el entorno local llega a Mailpit) → si hay una reserva `EN_ESTADIA` se abre su detalle; si no, el selector de reservas. Los mensajes de código inválido, vencido o bloqueo los define el API. «Cerrar sesión» revoca el refresh en el servidor y borra los tokens aunque no haya red. Requiere Spring con las rutas `/api/v1/app/*` y `EXPO_PUBLIC_API_URL` configurada.

Ejecuta `pnpm test:acceso` para probar el cliente con un servidor simulado. La prueba conectada contra Spring y Mailpit se registra aparte.

## Room Service y pedidos (HU-HUE-10, HU-HUE-11)

Durante la estadía el menú (`GET .../menu`) se agrupa por categoría con precio en quetzales; los productos `AGOTADO` se muestran sin permitir agregarlos. El carrito envía solo ítems y cantidades, con notas opcionales para el pedido (el contrato define notas por pedido, no por ítem); el servidor calcula precios y total, y el cargo llega a la cuenta al entregarse. Si un producto se agotó, el API responde 409 con los ítems afectados y el menú se recarga.

«Mis pedidos» se suscribe por STOMP a `/user/queue/pedidos` en `ws(s)://<API>/ws` con el JWT del huésped mientras la pantalla está abierta. Cada evento `PEDIDO_ACTUALIZADO` reemplaza el pedido en la lista; al conectar o reconectar se recarga con `GET .../pedidos`. Un pedido cancelado muestra el motivo de Room Service. La app no cancela ni modifica pedidos.

## Limpieza y artículos (HU-HUE-12 a HU-HUE-14)

Durante la estadía (`EN_ESTADIA`) el huésped pide limpieza con comentario opcional o artículos del catálogo `GET .../articulos`, sin superar `cantidadMaxima`. Si ya hay una limpieza pendiente o en proceso, se muestra el aviso del API (409). La lista de solicitudes se recarga al abrir la pantalla y al deslizar; solo las `PENDIENTE` pueden cancelarse. Fuera de la estadía solo se consulta el historial. Prueba el cliente con `pnpm test:servicios`.
