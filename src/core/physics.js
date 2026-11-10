// Ayudas matemáticas y choques entre rectángulos. Sin Phaser.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
export const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));

// ¿Se tocan dos cajas {x, y, w, h}?
export const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function hits(box, list) {
  for (const s of list) if (ov(box, s)) return true;
  return false;
}

// Mueve un cuerpo primero en x y después en y, empujándolo fuera de lo sólido.
// Deja `onGround` y `ground` (el sólido que pisa) para las plataformas que se mueven.
export function moveBody(b, dt, list) {
  b.x += b.vx * dt;
  for (const s of list) {
    if (s === b || !ov(b, s)) continue;
    if (b.vx > 0) b.x = s.x - b.w;
    else if (b.vx < 0) b.x = s.x + s.w;
    else {
      const l = b.x + b.w - s.x, r = s.x + s.w - b.x;
      b.x += l < r ? -l : r;
    }
    b.vx = 0;
  }
  b.y += b.vy * dt;
  b.onGround = false;
  b.ground = null;
  for (const s of list) {
    if (s === b || !ov(b, s)) continue;
    if (b.vy >= 0) { b.y = s.y - b.h; b.onGround = true; b.ground = s; } else b.y = s.y + s.h;
    b.vy = 0;
  }
}
