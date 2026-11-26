# Animación de la mascota (perrito) con AniCraft

> Contexto para retomar el trabajo: animar por partes al perrito del saludo del Home (que salte, salude con la pata y mueva la cola).
> Fecha: 25 de noviembre de 2026.
>
> **Estado: hecho.** El perrito ya va por capas en la app (`app-mascot`), animado con **SVG + CSS**, no con Lottie: AniCraft 0.2.1 no exporta un Lottie que sirva (ver §8). El material de diseño quedó en `design/mascota/` (con su README).

## 1. Objetivo

El perrito es el anfitrión del Home y la cara del asistente de IA. Hoy se anima **entero** con CSS porque es un PNG plano. La meta es que **salude con el cuerpo**: cabeza, orejas, pata y cola por separado.

Movimientos que pide el diseño (Figma, guía «Saludo · guía de animación de la mascota»):

| # | Movimiento | Cuándo | Tiempo sugerido |
|---|---|---|---|
| 1 | Entrada: salta desde abajo y cae con un rebote | Al abrir el Home, una vez por sesión | 0–450 ms |
| 2 | Saluda: levanta la pata delantera y la mueve 2 veces | Justo después de la entrada | 450–1300 ms |
| 3 | Reposo: mueve la cola cada ~9 s y parpadea | En bucle | — |
| 4 | Curioso: inclina la cabeza | Cuando hay pendientes | Al entrar |
| 5 | Celebra (salta de alegría) o duerme | Todo al día o cumpleaños / de noche | Según el momento |

Reglas:
- Nada de movimiento constante: tras la entrada, solo la cola cada ~9 s.
- Con "reducir movimiento" activado en el teléfono: pose fija.
- Tocar al perrito abre el mini chat de la IA (ya funciona).

## 2. Estado antes de este trabajo (histórico)

- **Imagen:** `src/assets/images/logo app.png` (la misma del botón de IA). Un solo PNG, sin capas.
- **Componente:** `src/app/shared/components/home-greeting/home-greeting.component.ts` (`app-home-greeting`).
  - Hoy anima el PNG entero con CSS: `hop` (entrada), `wave` (balanceo, 2 veces) y `sway` (cada 9 s).
  - La entrada se muestra una vez por sesión: `HomePage.greetAnimate` usa `sessionStorage['homeGreeted']`.
  - `@media (prefers-reduced-motion: reduce)` quita las animaciones.
  - El escenario del perrito mide 132 × 150 px; el perrito, 104 × 110, parado sobre una sombra (`.floor`) que hace de piso.
- **Estados del saludo** (`mood`): `morning`, `afternoon`, `night`, `welcome`, `birthday`. Salen de `buildGreeting()` en `src/app/shared/utils/home-today.util.ts`. Sirven para elegir qué animación usar (por ejemplo, dormir de noche o celebrar en el cumpleaños).

## 3. Diseño en Figma

Archivo de siempre: `e9FbM805Y2oAmOgIbcL0Hj` (Page 1).
- Componente `Home/Saludo` con 5 variantes: nodo `2313:566`.
- Guía de animación con fotogramas clave y capas: nodo `2313:567`.
- Pantallas del Home propuesto: `2306:341` (con clínica) y `2310:500` (sin clínica).

## 4. AniCraft

- **Qué es:** animación vectorial 2D con línea de tiempo, de la suite Craft (ArtCraft / Storyteller). **No es ArtCraft**, que es para generar imágenes y video con IA.
- **Instalación:** `C:\Program Files\ArtCraft\AniCraft\`, versión 0.2.1, instalada con el ArtCraft Launcher.
- **Línea de comandos:** `anicraft-cli.exe`. Lo útil:
  - `anicraft-cli mcp [archivo]`: servidor MCP para asistentes de IA.
  - `anicraft-cli commands`: lista todos los comandos con sus parámetros.
  - `anicraft-cli new --out x.anicraft [--width W] [--height H] [--fps F]`
  - `anicraft-cli exec <archivo> <command.id> [<json>] [--save out.anicraft]` y `run <archivo> <script.json>`
  - `render`, `render-seq` y `gif` para previsualizar.
- **Conectado a Claude Code** (alcance local de este proyecto):
  ```bash
  claude mcp add anicraft -- "C:/Program Files/ArtCraft/AniCraft/anicraft-cli.exe" mcp
  ```
  Las herramientas aparecen al **reiniciar la sesión** de Claude Code. Se comprueba con `/mcp` o con `claude mcp list` (estado «Connected»).
- **Importar** (`file.import`): `.svg`, `.png` y `.jpg` al escenario, en una capa nueva o en la activa.
- **Exportar:**
  - `file.export_lottie`: **el formato elegido para la app**. Transparente por defecto, con `from`/`to` por fotogramas.
  - `file.export_sprite_sheet`: PNG con un `.json` al lado. Es el plan B.
  - `file.export_svg` (un fotograma), `export_png_sequence`, `export_gif`, `export_video` (necesita ffmpeg) y `export_html`.
- **Documentación:** la CLI menciona `docs/mcp.md` y `docs/plugins.md`, pero no vienen en la instalación. No se encontró documentación pública de AniCraft.

## 5. Plan

1. **Separar al perrito en partes**, cada una en PNG transparente o SVG: cabeza, oreja izquierda, oreja derecha, ojos (para el parpadeo), cuerpo, pata delantera derecha (el saludo), pata delantera izquierda, cola y sombra.
   - **Opción A (recomendada para empezar):** recortar el PNG actual en piezas. Conserva el dibujo exacto de la marca. Cuidado con los bordes: rellenar lo que queda detrás de la pata y la cola para que no aparezcan huecos al moverlas.
   - **Opción B:** redibujar en vector (en AniCraft o en Figma). Se mueve más fluido, pero toma más trabajo.
   - Guardar las piezas en `design/mascota/` o en una carpeta de trabajo, no en `src/assets`.
2. **Armar la escena en AniCraft** con el MCP: un documento cuadrado (por ejemplo 512 × 512, 30 fps), una pieza por capa y el punto de giro de cada una (base de la cola, hombro de la pata, cuello).
3. **Animar los movimientos** de la sección 1, cada uno como un tramo de fotogramas con nombre, para poder exportarlos por separado o elegir el tramo en la app.
   - Previsualizar con `anicraft-cli gif` antes de exportar.
4. **Exportar a Lottie** (`file.export_lottie`), con un archivo por movimiento o uno solo con todos los tramos.
   - Destino: `src/assets/animations/mascota-*.json`.
   - Vigilar el peso: lo ideal es menos de 100 KB por archivo.
5. **Integrar en la app:**
   - Instalar `lottie-web` y usar su versión ligera, `lottie_light`, que solo hace SVG.
   - En `app-home-greeting`, reemplazar el `<img>` del perrito por un contenedor donde se monta la animación.
   - Entrada y saludo una vez por sesión, luego el reposo en bucle; elegir el movimiento según `view.mood` (noche → dormir, cumpleaños o todo al día → celebrar, pendientes → curioso).
   - Si el teléfono pide reducir movimiento, o si el Lottie no carga, mostrar el PNG actual como pose fija.
   - Mantener el tamaño del escenario (132 × 150) para no mover el diseño.
6. **Probar:** que pasen las pruebas (`npx ng test … --include='src/**/home-today*.spec.ts'` y las demás de `tsconfig.spec.vet.json`), una captura en el navegador, el build de producción y luego el despliegue.

## 6. Decisiones (resueltas el 25 nov 2026, ver §8)

- ~~Recortar el PNG o redibujar~~: se recortó y se vectorizó cada pieza, y la pata que saluda se redibujó en vector.
- ~~Un Lottie o varios~~: no se usa Lottie. Va como SVG en línea + CSS, con una clase por pose.
- Sigue abierto: si el botón flotante de la IA también usa la animación.

## 7. Otros

- `C:\Users\palac\src\artcraft-mcp`: clon del conector de la comunidad para **ArtCraft** (`smoermeow/artcraft-mcp`). Tiene un arreglo local para rutas de Windows y sus 56 pruebas pasan. **No sirve para AniCraft**; se puede borrar si no se va a generar imágenes con ArtCraft desde Claude.
- ArtCraft (imágenes y video con IA) no está instalado; solo el Launcher y AniCraft.

## 8. Lo que se hizo (25 nov 2026)

**AniCraft y Lottie, probado:** al exportar, AniCraft 0.2.1 avisa `bitmap fills (not exported yet)`: los PNG no salen. Con vectores, cada interpolación se «hornea» en todos los fotogramas, con todos los puntos de cada trazo y sin claves de giro ni de posición. Con este dibujo serían varios MB, fijos a 30 fps. Por eso se cambió el plan:

1. **Piezas** (opción A, pero vectorizada): el PNG se llevó a 4x, se ajustó a los 7 colores de la marca y se separó por las líneas oscuras en cola, cuerpo, oreja izquierda, oreja derecha, cabeza, ojos (cada uno aparte) y un «pecho» que tapa la pata original al saludar. Después se vectorizó con vtracer: unos 60 KB de SVG en total.
2. **La pata que saluda** se dibujó en vector con el mismo trazo (recortada del PNG se rompía al girarla). En reposo se ve la pata original y solo durante el saludo aparece la vectorial.
3. **En la app:** `src/app/shared/components/mascot/` (`app-mascot`, declarado en `SharedModule`). El SVG está en línea y las animaciones van en el SCSS del componente; cada pieza gira desde su articulación (`transform-box: view-box`).
   - `app-home-greeting` usa `<app-mascot [pose]="view.pose" [intro]="animate">` en lugar del `<img>`. El escenario sigue midiendo 132 × 150 y tocar al perrito sigue abriendo el mini chat.
   - `GreetingView` tiene un campo nuevo, `pose` (`MascotPose`): bienvenida → `hello`, pendientes → `curious`, cumpleaños o todo al día → `celebrate`, noche → `sleep`.
   - Tiempos de la guía: entrada 0–450 ms (salto con rebote, aplastado al caer y las orejas rebotan), saludo 450–1300 ms (la pata sube junto a la cara y se mueve 2 veces, y la cabeza acompaña), después la pose. En reposo solo la cola cada ~9 s y un parpadeo. De noche no saluda ni mueve la cola: llega dormido y cabecea cada ~9 s.
   - Con «reducir movimiento» (en Windows, cuando los efectos de animación están apagados) no salta, pero la cola, el parpadeo, la pata y la cabeza sí se mueven. Al principio quedaba totalmente quieto, y en un equipo con las animaciones apagadas parecía que no funcionaba.
4. **AniCraft** quedó como editor: `design/mascota/perrito.anicraft` tiene una capa por pieza, importada desde `design/mascota/svg/`.
5. **Pruebas:** `mascot.component.spec.ts` (capas y clases) y las poses en `home-today.util.spec.ts`. Se agregó `src/**/mascot*.spec.ts` a `tsconfig.spec.vet.json`. Pasan 366 de 366 y el build de producción sale bien.

Pendiente:
- Ver en el teléfono cómo se ve el salto con el banner real y ajustar los tiempos si hace falta.
- Decidir si el botón flotante de la IA también usa `app-mascot` (por ejemplo, que salude al aparecer).
- El MCP de AniCraft no estaba cargado en esta sesión: se usó la CLI (`anicraft-cli run/exec/render`).

## 9. Más movimiento, IA y pantalla de carga (25 nov 2026, noche)

- **Saluda con la pata siempre al entrar**, también de noche: saluda y después se duerme.
- **Reposo más vivo:** respira; la cabeza mira a los lados cada ~6 s, la cola se mueve cada ~4 s, las orejas se agitan (cada ~5 y ~7 s) y parpadea cada ~4,6 s. Cada tramo va con ease-in-out para que se mueva como un péndulo. El navegador interpola a la frecuencia de la pantalla (60–120 fps), así que no hace falta «más fotogramas».
- **Dormido:** respira hondo, cabecea cada ~6 s y la cola se mece despacio.
- **Pose `think`** (nueva en `MascotPose`): ladea la cabeza mientras la IA responde.
- **Al tocarlo** vuelve a saludar (`MascotComponent.greet()`), en el Home y en el botón de la IA cuando sale su mensajito.
- **En la IA:**
  - botón flotante (`ai-fab`): entra y saluda la primera vez de la sesión, y saluda otra vez con el mensajito;
  - botón anclado (`ai-dock`);
  - cabecera del mini chat: saluda al abrirlo y piensa mientras responde;
  - bienvenida del chat completo;
  - el avatar de «escribiendo…».
  Los avatares de los mensajes ya enviados siguen siendo el PNG, para no cargar muchos SVG.
- **Pantalla de carga:** `src/index.html` muestra `assets/images/mascota-animada.svg` mientras arranca Angular. `AppComponent` la desvanece al terminar la primera navegación, pero no antes de 1,4 s, para que alcance a saludar (`hideSplash`, `SPLASH_MIN_MS`).
- **Reducir movimiento:** solo quita los saltos; lo demás se mueve en su sitio.
- **Peso:** el SVG va en el bundle inicial porque el botón de la IA está en toda la app: unos 70 KB, unos 16 KB comprimidos.
- **Pruebas:** 370 de 370, incluida la de la pantalla de carga (`app.component.spec.ts`, agregada a `tsconfig.spec.vet.json`). El build de producción sale bien.

## 10. Diálogos al tocarlo, saludo de 3 y perrito más grande (25 nov 2026)

- **Saludo:** agita la pata **3 veces**, de 450 a 1600 ms. Las poses empiezan a los 1,6 s y la pantalla de carga dura al menos 1,7 s.
- **Cada toque al perrito del Home** hace un movimiento distinto con su globo de diálogo (`src/app/shared/utils/mascot-talk.util.ts`):
  - **De día:** saluda («¡Hola otra vez! 👋»), salta («¡Guau! ¡Qué alegría verte!»), se ríe meneándose («¡Jiji, me haces cosquillas!»), ladea la cabeza («¿Qué hacemos hoy?»), mueve la cola feliz («¡Tus mascotas te quieren mucho!»).
  - **De noche:** se despierta («¿Eh? ¡Ah, eras tú! 😴», «Cinco minutitos más…»), saluda y mueve la cola.
  - La última reacción invita a hablar («¿Hablamos? Tócame otra vez 💬», en un globo morado) y **el toque siguiente abre el mini chat**. **Esto cambia lo de antes:** tocarlo ya no abre el chat de una. Si no se toca, el ofrecimiento se olvida a los ~7,5 s.
  - El globo vuelve solo al del saludo a los 4,5 s.
- **Movimientos nuevos** en `app-mascot`, con `play(act)` (`MascotAct`) y las clases `act-*`: `wave`, `jump`, `shake`, `tilt`, `wag` y `wake`. Con «reducir movimiento» también se ven, porque los provoca la persona.
- **Más grande:**
  - En el Home, el escenario pasa de 132 × 150 a 154 × 184 y el perrito de 104 × 110 a 134 × 138. El banner mide al menos 184 px de alto.
  - En el botón de la IA, el perrito pasa de 38 a 44 px.
- **Pruebas:** `mascot-talk.util.spec.ts` revisa los diálogos y que el chat solo se abra después del ofrecimiento. Pasan 375 de 375 y el build de producción sale bien.
