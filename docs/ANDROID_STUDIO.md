# Instalar Villa Serena con Android Studio en este Mac

El proyecto nativo está generado en `villa-serena-movil/android` mediante Expo SDK 54. Esa carpeta se ignora en Git: la configuración fuente vive en app.json/app.config.ts y se regenera con `pnpm exec expo prebuild --platform android --no-install`.

## Abrir y ejecutar

1. Android Studio → Open → carpeta `villa-serena-movil/android`, no la raíz JavaScript.
2. En Settings → Build, Execution, Deployment → Build Tools → Gradle, selecciona **JDK 17**. Este Mac tiene `/Users/carloseduardogomezreyes/Library/Java/JavaVirtualMachines/ms-17.0.19/Contents/Home`. El JDK 25 incluido en Android Studio puede ser incompatible con el Gradle del proyecto.
3. Espera la sincronización de Gradle. Si solicita componentes del SDK, instálalos desde SDK Manager. Conserva las versiones que pide el proyecto generado.
4. Device Manager → inicia **Pixel_7**, o conecta tu Android por USB con depuración USB activada y acepta la autorización en el teléfono.
5. Selecciona el módulo **app**, el dispositivo y pulsa Run ▶.

## Servidor JavaScript

El APK debug utiliza Metro. Abre una terminal en la raíz móvil:

```sh
pnpm exec expo start --dev-client --port 8081
```

Con el teléfono conectado por USB, o el emulador abierto:

```sh
"$HOME/Library/Android/sdk/platform-tools/adb" reverse tcp:8081 tcp:8081
```

Abre Villa Serena. Si el launcher pide la URL, usa `http://localhost:8081` después de aplicar adb reverse. Con teléfono por Wi-Fi usa la IP LAN de tu Mac y permite el puerto 8081.

## Compilar desde terminal

```sh
cd android
JAVA_HOME="$HOME/Library/Java/JavaVirtualMachines/ms-17.0.19/Contents/Home" ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew assembleDebug
```

El resultado está en `android/app/build/outputs/apk/debug/app-debug.apk`. Para instalarlo:

```sh
"$HOME/Library/Android/sdk/platform-tools/adb" install -r app/build/outputs/apk/debug/app-debug.apk
```

También puedes arrastrar el APK al emulador. El build debug necesita Metro abierto; no es el APK final de distribución.

## Qué comprobar

Bienvenida → Ver cuenta de prueba → aceptar cancelación de pedidos → simular pago → confirmar check-out. Los datos se reinician al recargar. La prueba push no funcionará hasta vincular Expo y Firebase y volver a compilar. Android Studio permite probar las pantallas antes de configurar esas cuentas.

## Verificación realizada en este Mac

Expo Go 54.0.8 se instaló correctamente en Pixel_7 y Expo abrió Villa Serena; Metro generó el bundle Android. Esto confirma instalación/carga con Expo Go, no un APK propio. La primera compilación nativa está descargando NDK 27.1.12297006; todavía no hay app-debug.apk. La inspección visual nativa no se completó por permisos del control de interfaz.

Para usar Expo Go en el emulador abierto puedes ejecutar `pnpm exec expo start --go --android`. No sirve para probar push.
