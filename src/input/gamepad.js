// Controles (Xbox, PlayStation y similares) con la Gamepad API del navegador.
// Botones estándar: 0 A/Cruz · 1 B/Círculo · 2 X/Cuadrado · 3 Y/Triángulo · 9 Start · 12-15 cruceta.

function pads() {
  try { return Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean); }
  catch { return []; }
}

// Saltar: A o B · Concha: X o Y · Pausa: Start
export function readPad() {
  const r = { left: false, right: false, jump: false, act: false, start: false };
  for (const p of pads()) {
    const b = (n) => !!(p.buttons[n] && p.buttons[n].pressed);
    const ax = p.axes[0] || 0;
    r.left ||= b(14) || ax < -0.5;
    r.right ||= b(15) || ax > 0.5;
    r.jump ||= b(0) || b(1);
    r.act ||= b(2) || b(3);
    r.start ||= b(9);
  }
  return r;
}

// Botones recién apretados (para menús y pausa).
let prev = {};
export function padEdges() {
  const now = { up: false, down: false, left: false, right: false, a: false, b: false, start: false };
  for (const p of pads()) {
    const b = (n) => !!(p.buttons[n] && p.buttons[n].pressed);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    now.up ||= b(12) || ay < -0.5; now.down ||= b(13) || ay > 0.5;
    now.left ||= b(14) || ax < -0.5; now.right ||= b(15) || ax > 0.5;
    now.a ||= b(0); now.b ||= b(1); now.start ||= b(9);
  }
  const e = {};
  for (const k in now) e[k] = now[k] && !prev[k];
  prev = now;
  return e;
}
