"""Genera los íconos de la PWA (public/icons): la concha espiral de Muda brillando, con una perla.

Uso: python tools/make-icons.py   (necesita Pillow: pip install pillow)
Reemplázalos por tu propio ícono cuando tengas uno; mantén los mismos nombres y tamaños.
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

S = 2048  # se dibuja grande y después se achica, para que los bordes queden suaves
FONDO_CENTRO = (31, 95, 104)
FONDO_BORDE = (12, 42, 48)
BRILLO = (127, 224, 212)
CONCHA = (98, 200, 186)
CONCHA_LINEA = (42, 135, 124)


def mezcla(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def curva(p0, p1, p2, n=40):
    """Puntos de una curva cuadrática, igual que quadraticCurveTo del juego."""
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
            for t in (i / n for i in range(n + 1))]


def linea(d, pts, color, ancho):
    d.line(pts, fill=color, width=round(ancho), joint="curve")
    r = ancho / 2
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x - r, y - r, x + r, y + r], fill=color)


def icono(escala=1.0):
    im = Image.new("RGB", (S, S), FONDO_BORDE)
    d = ImageDraw.Draw(im)
    # Fondo: mar profundo, más claro al centro
    cx, cy, rmax = S / 2, S * 0.42, S * 0.75
    for i in range(160, 0, -1):
        r = rmax * i / 160
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=mezcla(FONDO_CENTRO, FONDO_BORDE, i / 160))
    # Brillo detrás de la concha
    glow = Image.new("L", (S, S), 0)
    gd = ImageDraw.Draw(glow)
    gx, gy, gr = S / 2, S * 0.47, S * 0.41 * escala
    for i in range(120, 0, -1):
        r = gr * i / 120
        gd.ellipse([gx - r, gy - r, gx + r, gy + r], fill=round(115 * (1 - i / 120)))
    im = Image.composite(Image.new("RGB", (S, S), BRILLO), im, glow.filter(ImageFilter.GaussianBlur(S / 60)))
    d = ImageDraw.Draw(im)

    # Concha espiral (el mismo dibujo del juego, en unidades de 1 = 1 píxel del juego)
    k = S / 1024 * 19 * escala
    ox, oy = S / 2, S / 2 + S * 0.25 * escala
    P = lambda x, y: (ox + x * k, oy + y * k)
    contorno = curva(P(-14, 0), P(-15, -15), P(3, -29)) + curva(P(3, -29), P(15, -14), P(14, 0))[1:] + curva(P(14, 0), P(0, 4), P(-14, 0))[1:]
    d.polygon(contorno, fill=CONCHA)
    linea(d, contorno, CONCHA_LINEA, 2 * k)
    for n in range(3):
        y, w = -6 - n * 7, 12 - n * 3
        linea(d, curva(P(-w, y), P(0, y + 4), P(w, y - 1)), CONCHA_LINEA, 2 * k)
    # Reflejo
    luz = Image.new("L", (S, S), 0)
    ImageDraw.Draw(luz).ellipse([*P(-7.5, -19), *P(-2.5, -9)], fill=102)
    luz = luz.rotate(math.degrees(0.5), center=P(-5, -14))
    im = Image.composite(Image.new("RGB", (S, S), (255, 255, 255)), im, luz)
    d = ImageDraw.Draw(im)

    # Perla
    px, py, pr = S / 2 + S * 0.225 * escala, S / 2 + S * 0.215 * escala, S * 0.045 * escala
    for i in range(60, 0, -1):
        t = i / 60
        r = pr * t
        c = mezcla((255, 255, 255), (246, 239, 226), min(1, t / 0.6)) if t < 0.6 else mezcla((246, 239, 226), (217, 205, 187), (t - 0.6) / 0.4)
        off = (1 - t) * pr * 0.38
        d.ellipse([px - off - r, py - off - r, px - off + r, py - off + r], fill=c)
    return im


def guardar(im, px, nombre):
    im.resize((px, px), Image.LANCZOS).save(OUT / nombre)


base = icono()
guardar(base, 192, "icon-192.png")
guardar(base, 512, "icon-512.png")
guardar(base, 180, "apple-touch-icon.png")
guardar(base, 64, "favicon-64.png")
# Versión "maskable": el dibujo más chico, para que Android pueda recortarlo en círculo sin cortar nada.
guardar(icono(escala=0.8), 512, "icon-maskable-512.png")
print("Íconos listos en", OUT)
