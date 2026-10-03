# Estado de las tareas de Carlos

## Preparado localmente

- Expo SDK 54, Router, NativeWind, cliente HTTP y SecureStore.
- Configuración development/preview de EAS y prueba push.
- Proyecto nativo Android generado; instrucciones para Android Studio/JDK 17.
- Pantallas de correo/código, selector y detalle de reservas con datos de prueba.
- Menú, carrito, pedidos y solicitudes con datos de prueba.
- Cuenta, pago simulado, check-out y resumen de factura.
- Pruebas de cliente HTTP, simulador OTP, cuenta y servicios; revisión TypeScript/lint y bundle Android.

## Pendiente para darlo por terminado

| Tarea | Necesita |
|---|---|
| Instalación y prueba nativa | Expo Go instalado/carga probada en Pixel_7; falta completar Gradle/SDK/NDK e instalar APK propio |
| OTP, JWT, refresh y cierre de sesión reales | Seguridad de Pablo, contrato aprobado y Outbox de Hugo |
| Mis reservas API y autorización del huésped | Contrato y módulo de reservas |
| Solicitudes API y eventos | Contrato, permisos de seguridad y WebSocket/Outbox de Hugo |
| Seguimiento de pedidos en vivo | API de Room Service y contrato x-websocket |
| Push real, registro y revocación de token | Expo/Firebase, FCM v1 y endpoints/Outbox |
| Stripe, check-out transaccional, factura PDF y correo | Endpoints de Pablo y facturación de Hugo |
| Pull requests y avance registrado | Revisar, subir, fusionar y verificar los criterios de los prompts |

El API en main todavía tiene solo ApiApplication y migraciones; no hay módulos auth ni Outbox. Se encontró el contrato parte 1 en origin/obj0-contrato-openapi, se copió sin modificar y se generaron tipos en la app. Ese contrato no contiene aún las rutas de huésped, Room Service, solicitudes ni cuenta. No se reemplazaron las piezas de otros integrantes ni se inventó un contrato. Los datos de prueba no se sincronizan con la web ni reemplazan controles de seguridad del servidor.

## Revisión del 3 de octubre de 2026

- Contrato copiado desde `villa-serena-api`, rama `obj0-contrato-openapi`, commit `b4f26f25e225da1c4adefd90a9f17f971cd1cd76`.
- `lib/api/schema.d.ts` generado con openapi-typescript. La renovación y el almacenamiento validan los campos del contrato Tokens.
- Pantallas privadas protegidas con Expo Router. Cerrar la sesión de prueba elimina las rutas privadas del historial; el acceso explícito a cuenta de prueba abre una sesión de demostración.
- Reservas reflejan FINALIZADA tras el check-out; entrar después del check-out muestra el selector cuando no hay estadía activa.
- Pedidos y solicitudes usan la hora simulada de Guatemala. Room Service deshabilitado fuera de EN_ESTADIA.
- El simulador de OTP conserva los intentos por correo aunque se reenvíe el código o se cambie de correo.
- Espacio inferior seguro en las pantallas de reservas, estadía, pedidos, menú y solicitudes.
- Listener de notificaciones preparado para development build. Clave local provisional `pantalla` con valores `pedidos` o `solicitudes`: debe confirmarse contra parte 2 antes de conectar Outbox. No registra tokens en un API inexistente y no se presenta como push integrado.
- TypeScript, ESLint y pruebas locales de OTP, servicios, cuenta, cliente HTTP y rutas de notificaciones aprobadas. Bundle Android exportado; esto no equivale a un APK ni a una prueba de push remoto.
- El verificador de APK identifica dos requisitos ausentes: projectId de Expo y google-services.json de Firebase.

## Orden para terminar la integración

1. Josué entrega parte 2 de openapi.yaml; copiarla y regenerar tipos.
2. Pablo entrega emisión/renovación/revocación de JWT y permisos; Hugo entrega Outbox y WebSocket.
3. Carlos implementa OTP, consultas de reservas propias, dispositivos push y solicitudes en Spring reutilizando esas piezas. Las migraciones existentes no se modifican.
4. Conectar cada pantalla a los endpoints tipados, mantener montos en centavos dentro de la interfaz y convertir montos del contrato al ingresar/salir.
5. Integrar pedidos con STOMP y recarga al reconectar; cuenta con pago Stripe/webhook y factura del API.
6. Vincular Expo/Firebase, configurar FCM v1, generar APK y probar en Android físico.
7. Probar correo en Mailpit, reserva ajena 404, eventos app/web, saldo tras webhook, check-out y apertura desde push antes de marcar las casillas de avance.

El usuario confirmó que seguridad y Outbox todavía no están desarrollados. Estos requisitos impiden dar por terminada la integración real; las pantallas siguen siendo una demostración local.
