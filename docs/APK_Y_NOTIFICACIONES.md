# APK de desarrollo y notificaciones — Carlos

La configuración local está preparada. Aún no se ha vinculado una cuenta Expo ni Firebase, generado un APK o probado una entrega push. Se mantiene Expo SDK 54.

## 1. Vincular Expo

Desde `villa-serena-movil`, con tu cuenta Expo:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
```

Usa el proyecto del equipo si ya existe. No crees otro duplicado. EAS agregará `extra.eas.projectId` y, si corresponde, `owner` a app.json; son identificadores públicos, no claves secretas. La configuración dinámica conserva esos valores. No pongas contraseñas en el código.

## 2. Firebase y Android

En [Firebase Console](https://console.firebase.google.com/), selecciona el proyecto del equipo o crea el acordado. Agrega una app Android con el paquete exacto `gt.villaserena.app`. Descarga `google-services.json` y colócalo en la raíz de esta app. app.config.ts lo detecta automáticamente. Está ignorado por Git, pero EAS lo incluirá en la carga del build mediante .easignore.

La cuenta de servicio **no** es google-services.json. Crea/obtén la clave FCM v1 según la [guía oficial de Expo](https://docs.expo.dev/push-notifications/fcm-credentials/), mantenla fuera del repositorio y súbela solo al proyecto EAS autorizado:

```sh
npx eas-cli@latest credentials --platform android
```

Selecciona la gestión de clave de cuenta de servicio para push FCM V1. No pegues esa clave en el chat ni la subas a Git. Las dos configuraciones deben pertenecer al mismo proyecto Firebase.

## 3. Comprobar y generar

```sh
node scripts/verificar-build.cjs
npx eas-cli@latest build --profile development --platform android
```

El verificador informa si falta Firebase o el identificador EAS, sin mostrar claves. Descarga el APK resultante e instálalo en Android. El build usa servicios de EAS; comprueba el plan y la disponibilidad de tu cuenta cuando lo ejecutes.

```sh
pnpm exec expo start --dev-client
```

Abre el proyecto desde el APK con computadora y teléfono en la misma red. Para seguir usando Expo Go SDK 54: `pnpm exec expo start --go`.

## 4. Prueba push

En la bienvenida toca **Probar notificaciones · Desarrollo** y después el botón de permisos. Concede el permiso en Android. Busca el Expo push token en la consola local de Metro. Solo se imprime al solicitar esta prueba; no es un JWT ni la clave FCM.

En la [herramienta oficial de prueba](https://expo.dev/notifications) introduce el token y un mensaje sin datos personales (por ejemplo «Prueba Villa Serena»). Comprueba su llegada con el APK abierto y también en segundo plano. Esos pasos requieren el teléfono y no se han verificado aquí.

Para un APK sin development client usa el perfil `preview`:

```sh
npx eas-cli@latest build --profile preview --platform android
```

## Pendiente del objetivo 3A

Registrar y revocar el token con el API del huésped; enviar push mediante el Outbox de Hugo; abrir el pedido o solicitud al tocar el aviso. No se implementan en este bloque. Marca el avance del documento 17 después de probar los criterios y fusionar el PR.
