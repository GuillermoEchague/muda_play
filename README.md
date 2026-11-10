# Muda (Phaser 3 + PWA)

Juego de plataformas 2D: eres **Pinza**, un cangrejo ermitaño. Las conchas te dan poderes, pero solo cabe una a la vez, y para avanzar a veces hay que dejarla atrás.

> *Para crecer hay que soltar la casa que te queda chica.*

Está hecho con **Phaser 3** y se puede instalar en el celular como **PWA**: se agrega a la pantalla de inicio, abre a pantalla completa y funciona sin internet. Es la versión en Phaser del prototipo en HTML y Canvas, diseñada con los puntos del curso de diseño narrativo (el detalle está en la tabla de abajo).

## Requisitos

- [Node.js](https://nodejs.org) versión LTS (22 o más nueva).
- Un navegador moderno: Chrome, Edge, Safari o Firefox.

## Cómo usarlo

Abre una terminal en esta carpeta y ejecuta:

```bash
npm install        # instala Phaser, Vite y el plugin de PWA (solo la primera vez)
npm run dev        # abre el juego en modo desarrollo, con recarga automática
```

Abre la dirección que aparece (por ejemplo `http://localhost:5173`).

| Comando | Para qué sirve |
| --- | --- |
| `npm run dev` | Desarrollo. Cada cambio en el código se ve al instante. |
| `npm test` | Pruebas de la lógica del juego, sin abrir el navegador. |
| `npm run build` | Arma la versión final en la carpeta `dist/`, con la PWA incluida. |
| `npm run preview` | Sirve la carpeta `dist/` para probar la PWA (instalar, jugar sin internet). |

### Probar en el celular

1. Conecta el computador y el celular a la misma red wifi.
2. Ejecuta `npm run dev` y abre en el celular la dirección **Network** que aparece (por ejemplo `http://192.168.1.20:5173`).
3. Pon el teléfono en horizontal.

Para **instalar** el juego y usarlo sin internet hace falta HTTPS. Eso funciona en `localhost` o una vez publicado (ver abajo), pero no desde la dirección de red local.

## Controles

| Acción | Teclado | Control | Celular |
| --- | --- | --- | --- |
| Moverse | Flechas o A / D | Cruceta o palanca | Botones ◀ ▶ (puedes deslizar el dedo entre ellos) |
| Saltar | Espacio, ↑, W o Z | A o B | Botón ▲ |
| Planear (concha morada) | Mantener saltar | Mantener A | Mantener ▲ |
| Concha: soltar, ponerse, cambiar o lanzar | X, ↓, S o K | X o Y | Botón de concha |
| Pausa | Esc o P | Start | Botón ⏸ arriba a la derecha |
| Salir al menú | Botón ✕ arriba a la derecha | | Botón ✕ |
| Sonido | M | | Menú de pausa |

- **Concha de infancia:** ninguna habilidad; sirve de escalón.
- **Espiral (verde):** doble salto.
- **Caracol (morada):** planear.
- **Erizo (dorada):** cruzar campos de erizos.
- **Sin concha:** Pinza tiembla. Un golpe más y vuelves a la última estrella de mar.
- **Mundo 5:** quieto dentro de tu concha, la luz del Acaparador no te ve.
- **Mundo 6:** frente al Acaparador, el botón de concha la **lanza**. Apunta al ojo cuando se abre.

## Los seis mundos y el curso

| Mundo | Etapa del viaje del héroe | Puntos del curso |
| --- | --- | --- |
| 1 · La playa | Mundo ordinario, llamada, primer umbral | 16 acto I con tutorial · 27 foreshadowing · 29 callback · 30 cliffhanger |
| 2 · Las rocas | Camino de pruebas | 36 tema y mecánica · 49 enable, don't tell · 22 tensión creciente |
| 3 · Las profundidades | Cueva interior y la prueba | 44 narrativa ambiental · 41 coherencia ludonarrativa · 31 suspense |
| 4 · Sin conchas | Punto medio y mentor | 34 contraste por oposición · 19 mentor · 50 leitmotiv en menor |
| 5 · La noche oscura | Noche oscura del alma | 31 suspense · 32 anticipación por contraste · 20 realización |
| 6 · La montaña | Clímax y retorno con el elixir | 50 dilema · 19 villano como reflejo · 23 clímax · 29 callback |

## Estructura

```text
src/
├─ main.js               configuración de Phaser
├─ pwa.js                actualización, instalación y avisos de la PWA
├─ settings.js           preferencias (sonido) y almacenamiento seguro
├─ core/                 lógica pura, SIN Phaser (se prueba con npm test)
│  ├─ constants.js       medidas del mundo y física
│  ├─ physics.js         choques entre cajas y ayudas matemáticas
│  ├─ levels.js          los 6 mundos como datos
│  ├─ world.js           jugador, conchas, enemigos, jefe y cámara
│  ├─ endings.js         el cierre de cada mundo
│  ├─ progress.js        mejores resultados guardados
│  └─ fixed-step.js      paso fijo de 60 cuadros por segundo
├─ gfx/art.js            todo el arte dibujado con código (texturas)
├─ input/                teclado, control y botones táctiles
├─ audio/sfx.js          efectos, rumor del mar y leitmotiv sintetizados
└─ scenes/               Boot, Title, Game, LevelEnd y la vista del mundo
```

La regla principal: **`src/core` decide qué pasa y Phaser solo dibuja y hace sonar.** El core deja eventos (`sfx`, `burst`, `motif`, `done`…) en una cola; la escena los vacía cada cuadro y los manda a la vista y al audio. La lógica avanza siempre a 60 cuadros por segundo exactos, así un salto mide lo mismo en una pantalla de 60 Hz o de 120 Hz.

## Usar tu propio arte

Hoy todo se dibuja con código en `src/gfx/art.js`, y cada imagen tiene un nombre: `shell-espiral`, `crab-red-0` … `crab-red-3`, `flea`, `gull-0`, `pearl`, `star-on`, `mount-beach`, `boss`, etc.

Para reemplazar una:

1. Exporta tu imagen con fondo transparente al mismo tamaño que la dibujada (por ejemplo, las conchas son de 48 × 48 con la base a 40 px del borde de arriba).
2. Ponla en `public/assets/`.
3. En `src/scenes/Boot.js`, cárgala en `preload()` con la misma clave: `this.load.image('shell-espiral', 'assets/shell-espiral.png')`. Lo que ya está cargado no se vuelve a dibujar.
4. Si cambias el tamaño, ajusta su punto de anclaje en `ORIGIN` (`src/gfx/art.js`).

Los archivos de `public/assets/` quedan guardados para jugar sin internet (límite de 8 MB por archivo en `vite.config.js`).

## Publicarlo en GitHub Pages

1. Sube el proyecto a un repositorio **público** de GitHub (`node_modules` y `dist` ya están en `.gitignore`; sí hay que subir `package-lock.json`).
2. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
3. Cada `git push` a `main` ejecuta `.github/workflows/deploy.yml`: instala, corre las pruebas, arma el juego y lo publica en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
4. Los jugadores verán el aviso "Hay una versión nueva del juego" con un botón para actualizar. GitHub puede tardar hasta 10 minutos en mostrar lo nuevo; si no lo ves, recarga con Ctrl+Shift+R.

| Problema | Causa | Arreglo |
| --- | --- | --- |
| La página publicada carga `/src/main.js` y no arranca | Pages está publicando la rama, no el resultado del build | Source en **GitHub Actions** |
| No aparece la opción de instalar | Se está usando `npm run dev`, no hay HTTPS o se abrió dentro de WhatsApp/Instagram | Probar con `npm run preview` en localhost o en el sitio publicado, en Chrome o Safari |
| iPhone: no hay botón instalar ni se puede cerrar el juego | Limitación de Safari | El menú muestra **Cómo instalar** y un aviso para salir |

## Íconos

Los íconos de `public/icons/` se generan con `tools/make-icons.py` (`pip install pillow` y luego `python tools/make-icons.py`). Puedes reemplazarlos por los tuyos, manteniendo los nombres y tamaños.
