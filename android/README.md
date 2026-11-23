# Iron Helm · app para Android

La misma web del juego (`iron_helm_game/`) empaquetada en una app nativa mínima: un `WebView` a pantalla completa que sirve los
ficheros de la propia APK desde `https://appassets.androidplatform.net/`. **No pide ningún permiso (ni Internet)** y la partida se guarda en el
propio dispositivo (`localStorage`).

## Instalar
1. Copia `releases/IronHelm.apk` al móvil (cable, nube, `adb install -r releases/IronHelm.apk`…).
2. Ábrela y permite «instalar apps de esta fuente» si el sistema lo pide. Requiere Android 7.0 o superior y un WebView actual (Chrome 90+, se actualiza solo).
3. La primera vez Android avisará de que la app va a pantalla completa («Entendido»). Gestos del sistema: desliza desde el borde para ver las barras; se ocultan solas.

> La APK está firmada con una clave personal (`~/.ironhelm/ironhelm-release.jks`, **fuera del repositorio**). Guarda una copia de seguridad de esa carpeta:
> sin ella no podrás publicar una actualización que se instale encima de la anterior (habría que desinstalar y perder la partida guardada).

## Regenerar
```bash
npm run apk                      # = node tools/build-apk.mjs   →  releases/IronHelm.apk (+ releases/IronHelm-<versión>.apk)
node tools/build-apk.mjs --debug --install   # APK depurable instalada en el dispositivo/emulador conectado
```
Necesita el SDK de Android (`$ANDROID_HOME`, por defecto `~/Library/Android/sdk`: build-tools y `platforms/android-34`) y un JDK 17+ (`IRONHELM_JAVA_HOME`).
No usa Gradle: `aapt2` + `javac` + `d8` + `zipalign` + `apksigner`. El script falla si cambian el paquete, la versión o los permisos, si la APK lleva código fuente (`js/`, mapas)
o si pesa más de 95 MB. Las cartas (480×675) se recomprimen a WebP (≈ 50 MB menos); el WebView las recibe con el mismo nombre `.jpg`.

## Cómo está hecha
- `src/app/ironhelm/digital/MainActivity.java`: WebView sin red (todo lo que no sea `appassets.androidplatform.net` se bloquea), inmersivo, sin recrear la actividad al rotar,
  pantalla siempre encendida, pulsación larga sin menú del sistema (el juego la usa para ver cartas en grande), diálogos `alert/confirm` nativos oscuros, `console.*` → logcat (`IronHelmJS`).
- **Muescas y barras**: la app inyecta `--sai-t/r/b/l` (px CSS) en el documento y las actualiza al girar o si cambia el recorte; todo el CSS del juego las usa.
- **Botón atrás**: llama a `window.ironHelmBack()` (`App.back()` en `js/ui/app.js`): cierra la ficha de carta, la mochila, el diario… y, si no queda nada, pregunta «¿Volver al menú?».
  En el menú principal, «Pulsa otra vez para salir» (doble pulsación en 2 s).
- Iconos generados por `tools/gen-android-icons.py` (escudo con espadas cruzadas del tapete de mazmorra), adaptativos y redondos.

## Qué se ha probado
Emulador Pixel 6 (Android 14, WebView Chrome 113), vertical y apaisado, con y sin recorte de pantalla: menú, posada, partida, combate, mochila, ajustes, botón atrás,
rotación a mitad de partida, Inicio/volver, partida guardada tras `force-stop`, teclado, pulsación larga y `logcat` sin errores. **No probado en un móvil real** (ni el audio, que el emulador no reproduce).
Además, `node tools/formatcheck.mjs` audita el formato de las pantallas principales en 7 tamaños (360×740 … 1600×900) con muescas simuladas.
