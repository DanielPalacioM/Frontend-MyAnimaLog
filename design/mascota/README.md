# Mascota por capas (el perrito del logo)

Fuente de diseño del perrito animado del Home (`app-mascot`). Guía de movimiento: Figma `e9FbM805Y2oAmOgIbcL0Hj`, nodo `2313:567`.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `vista-previa.gif` | La secuencia completa: entrada, saludo y celebración (fotogramas reales del componente) |
| `mascota.svg` | El perrito completo por capas, igual al template del componente |
| `src/assets/images/mascota-animada.svg` | El mismo perrito con sus estilos adentro: se anima solo, aunque se cargue como `<img>`. Es el de la pantalla de carga |
| `svg/01_sombra.svg` … `svg/10_pata.svg` | Una pieza por archivo, todas en el mismo lienzo de 300 × 300, listas para AniCraft o Figma |
| `perrito.anicraft` | Escena de AniCraft con una capa por pieza (las capas `pecho` y `pata` están ocultas: solo se ven al saludar) |
| `piezas/*.png` | Las piezas recortadas del PNG a 4x (1200 px), antes de vectorizarlas |
| `split.py`, `trace.py`, `build.py` | Scripts para regenerar todo desde el logo |

## Las capas

De atrás hacia adelante. El punto de giro va en coordenadas del dibujo (0–300).

| Capa | Clase CSS | Giro en | Para qué |
|---|---|---|---|
| sombra | `.shadow` | 170, 284 | Se encoge mientras salta |
| cola | `.tail` | 250, 262 | Se mueve cada ~9 s. Tiene una base extra escondida detrás del cuerpo para que no se abra al girar |
| cuerpo | `.body` | — | Tronco, collar y patas, tal cual el logo |
| pecho | `.chest` | — | Tapa la pata original mientras saluda (pecho liso y sombra debajo) |
| oreja izq. / der. | `.ear-l` / `.ear-r` | 62, 40 / 212, 26 | Rebotan un poco al caer. Más de ±6° deja ver el corte con la cabeza |
| cabeza | `.head`, `.head-pose` y `.head-idle` | 150, 182 | `.head` acompaña el saludo, `.head-pose` guarda la pose (curioso, dormido) y `.head-idle` mira a los lados cada ~6 s, cabecea dormida y se ladea al pensar |
| respiración | `.breath` | 150, 290 | Todo el cuerpo respira (más hondo dormido) |
| ojos | `.eye-l` / `.eye-r` | centro de cada ojo | Parpadeo (se aplastan) |
| pata | `.leg` | 122, 222 (hombro) | Dibujada en vector: aparece solo durante el saludo, girando de 22° (abajo) a ~150° (junto a la cara) |

## Cómo se hizo (y por qué no es Lottie)

1. `split.py`: lleva el PNG a 4x, ajusta cada píxel a los 7 colores de la marca y separa las piezas por las líneas oscuras del dibujo. Lo que queda tapado detrás de una pieza se rellena con el color de alrededor.
2. `trace.py`: vectoriza cada pieza con [vtracer](https://github.com/visioncortex/vtracer). Pesan unos 60 KB en total (unos 20 KB comprimidos).
3. `build.py`: arma el SVG por capas, agrega la pata en vector y escribe `mascot.component.html`. También deja una página de vista previa que congela la animación en los milisegundos que se le pidan.

AniCraft 0.2.1 se probó para exportar a Lottie, pero no sirve para esto:
- **No exporta imágenes**: el informe dice `bitmap fills (not exported yet)`.
- **Hornea las interpolaciones**: cada fotograma lleva todos los puntos de cada trazo, sin claves de giro ni de posición. Con este dibujo serían varios MB, y además queda fijo a 30 fps.

Por eso la animación va en **SVG en línea + CSS**: no necesita librería (`lottie-web` pesa unos 150 KB), funciona con «reducir movimiento» y cambia de pose con una clase. AniCraft queda como editor de las piezas (`perrito.anicraft`).

## Regenerar

En una carpeta de trabajo aparte (los scripts escriben `parts/` y `svg/` al lado):

```bash
pip install vtracer scipy numpy pillow
cp "src/assets/images/logo app.png" <trabajo>/src.png
cp design/mascota/*.py <trabajo>/ && cd <trabajo>
python split.py && python trace.py
STANDALONE=<repo>/src/assets/images/mascota-animada.svg python build.py <repo>/src/app/shared/components/mascot/mascot.component.html <repo>/src/app/shared/components/mascot/mascot.component.scss
```

Para ver fotogramas, `build.py` acepta un tercer argumento con las celdas, por ejemplo `'[{"cls":"intro pose-hello","t":800,"label":"saludo"}]'`, y deja `preview.html`. Se captura con el navegador sin ventana:

```bash
msedge --headless=new --screenshot=out.png --window-size=1290,480 file:///<trabajo>/preview.html
```
