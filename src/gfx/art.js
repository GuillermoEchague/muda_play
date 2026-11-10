// Every image in Muda drawn with code onto canvases (no Phaser).
// Boot.js turns them into textures with these names. To use your own art, load an image or atlas with the
// same name in Boot.js (for example this.load.image('shell-espiral', 'assets/shell-espiral.png')) and remove it from here.
// Everything is curves on purpose (course point 58: rounded lines and shapes read as soft and friendly).

export const SHELL_TYPES = ['infancia', 'espiral', 'caracol', 'erizo', 'propia'];
export const SHELL_STYLE = {
  infancia: { col: '#F7DDD3', str: '#D3907F' },
  espiral: { col: '#62C8BA', str: '#2A877C' },
  caracol: { col: '#AE98E2', str: '#6A53B4' },
  erizo: { col: '#EDB257', str: '#9A5B1E' },
  propia: { col: '#FFF6EA', str: '#C9A24A' },
};

// Where each image's "anchor" point sits (Phaser origin, 0..1), so the view can position them like the core does.
export const ORIGIN = {
  shell: [24 / 48, 40 / 48], // base of the shell
  crab: [32 / 64, 44 / 52], // between the feet
  enemy: [0.5, 0.5],
  glyph: [80 / 160, 30 / 80], // the glyph's upper edge sits on the ground
  claw: [96 / 520, 85 / 170],
};
export const CRAB_FRAMES = 4;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d') };
}

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- Shells ---------- */
export function drawShellShape(ctx, type) {
  const d = SHELL_STYLE[type];
  ctx.fillStyle = d.col; ctx.strokeStyle = d.str; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  if (type === 'espiral') { ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-15, -15, 3, -29); ctx.quadraticCurveTo(15, -14, 14, 0); ctx.quadraticCurveTo(0, 4, -14, 0); }
  else if (type === 'caracol' || type === 'propia') { ctx.moveTo(-15, 0); ctx.bezierCurveTo(-18, -31, 18, -31, 15, 0); ctx.quadraticCurveTo(0, 4, -15, 0); }
  else if (type === 'erizo') { ctx.moveTo(-14, 0); ctx.bezierCurveTo(-15, -24, 15, -24, 14, 0); ctx.quadraticCurveTo(0, 4, -14, 0); }
  else { ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-13, -16, 4, -25); ctx.quadraticCurveTo(14, -12, 12, 0); ctx.quadraticCurveTo(0, 3, -12, 0); }
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  if (type === 'espiral') { for (let k = 0; k < 3; k++) { const y = -6 - k * 7, w = 12 - k * 3; ctx.moveTo(-w, y); ctx.quadraticCurveTo(0, y + 4, w, y - 1); } }
  else if (type === 'caracol' || type === 'propia') {
    for (let a = 0; a < Math.PI * 4.2; a += 0.2) { const r = 1.5 + a * 0.85, x = Math.cos(a) * r, y = -12 + Math.sin(a) * r; if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  } else if (type === 'erizo') {
    // Dorado con nudos romos: no se confunde con el erizo enemigo (morado, de púas largas).
    ctx.fillStyle = d.str;
    for (let i = 1; i < 8; i++) {
      const t = i / 8, u = 1 - t;
      const x = u * u * u * -14 + 3 * u * u * t * -15 + 3 * u * t * t * 15 + t * t * t * 14;
      const y = 3 * u * u * t * -24 + 3 * u * t * t * -24;
      ctx.moveTo(x + 3, y); ctx.arc(x, y, 3, 0, Math.PI * 2);
    }
    ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, -6); ctx.quadraticCurveTo(0, -2, 8, -6);
  } else { ctx.moveTo(-9, -6); ctx.quadraticCurveTo(0, -3, 10, -7); ctx.moveTo(-5, -14); ctx.quadraticCurveTo(2, -11, 8, -15); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-5, -14, 2.5, 5, -0.5, 0, Math.PI * 2); ctx.fill();
}

function shellTexture(type) {
  const { c, ctx } = canvas(48, 48);
  ctx.translate(24, 40);
  drawShellShape(ctx, type);
  return c;
}

/* ---------- Crab ---------- */
// variant: 'red' (con concha), 'naked' (sin concha: más claro y con ojos grandes), 'old' (la mentora)
function crabTexture(variant, frame) {
  const { c, ctx } = canvas(64, 52);
  ctx.translate(32, 44);
  const naked = variant === 'naked', old = variant === 'old';
  const body = old ? '#D7A496' : naked ? '#F39C8B' : '#E7604A';
  const dark = old ? '#8F6458' : naked ? '#C9725F' : '#B23F2C';
  const walk = (frame / CRAB_FRAMES) * (Math.PI * 2) / 0.15;
  ctx.strokeStyle = dark; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = Math.sin(walk * 0.15 + i * 2.1) * 2.5;
    ctx.beginPath(); ctx.moveTo(-5 - i * 3, -6); ctx.quadraticCurveTo(-12 - i * 3, -9 + ph, -15 - i * 3, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4 + i * 3, -6); ctx.quadraticCurveTo(11 + i * 3, -9 - ph, 14 + i * 3, 0); ctx.stroke();
  }
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -8, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(-3, -11, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = body; ctx.strokeStyle = dark; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(15, -11, 6, 4.6, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(17, -12); ctx.lineTo(21, -13); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-13, -12, 4, 3.2, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(3, -14); ctx.quadraticCurveTo(2, -19, 4, -23); ctx.moveTo(8, -14); ctx.quadraticCurveTo(10, -19, 10, -23); ctx.stroke();
  const er = naked ? 3.6 : 3;
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(4, -24, er, 0, Math.PI * 2); ctx.arc(10, -24, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1C2A2E'; ctx.beginPath(); ctx.arc(5, -24, 1.5, 0, Math.PI * 2); ctx.arc(11, -24, 1.5, 0, Math.PI * 2); ctx.fill();
  if (old) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-4, -6); ctx.moveTo(0, -12); ctx.lineTo(3, -8); ctx.stroke();
  }
  return c;
}

// Dos ojos que asoman de la concha cuando Pinza se esconde (Mundo 5).
function peekTexture() {
  const { c, ctx } = canvas(24, 12);
  ctx.translate(12, 6);
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-3, 0, 2.6, 0, Math.PI * 2); ctx.arc(3, 0, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1C2A2E'; ctx.beginPath(); ctx.arc(-2, 0, 1.2, 0, Math.PI * 2); ctx.arc(4, 0, 1.2, 0, Math.PI * 2); ctx.fill();
  return c;
}

/* ---------- Enemies ---------- */
function fleaTexture() {
  const { c, ctx } = canvas(56, 48);
  ctx.translate(28, 36);
  ctx.fillStyle = '#C79C5E'; ctx.strokeStyle = '#8F6B3A'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, -9, 13, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -15); ctx.quadraticCurveTo(14, -24, 20, -22); ctx.moveTo(5, -16); ctx.quadraticCurveTo(8, -26, 14, -27); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-12, 2, -14, 4); ctx.moveTo(4, -2); ctx.quadraticCurveTo(9, 2, 12, 4); ctx.stroke();
  ctx.fillStyle = '#2A2016'; ctx.beginPath(); ctx.arc(7, -11, 2, 0, Math.PI * 2); ctx.fill();
  return c;
}

function gullTexture(flap) {
  const { c, ctx } = canvas(56, 48);
  ctx.translate(28, 24);
  ctx.fillStyle = '#F7FAFA'; ctx.strokeStyle = '#7E8D91'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-8, -16 * flap - 6, 0, 0); ctx.quadraticCurveTo(8, -16 * flap - 6, 18, 0); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 2, 11, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F2B544'; ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(17, 3); ctx.lineTo(10, 5); ctx.fill();
  ctx.fillStyle = '#25313A'; ctx.beginPath(); ctx.arc(7, 0, 1.4, 0, Math.PI * 2); ctx.fill();
  return c;
}

function urchinTexture(frame) {
  const { c, ctx } = canvas(48, 40);
  ctx.translate(24, 28);
  ctx.strokeStyle = '#4A2E5C'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  for (let i = 0; i < 13; i++) {
    const a = Math.PI + (i / 12) * Math.PI, wob = Math.sin(frame * 1.6 + i) * 1.2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * (17 + wob), Math.sin(a) * (17 + wob)); ctx.stroke();
  }
  ctx.fillStyle = '#6B4683'; ctx.beginPath(); ctx.ellipse(0, 1, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  return c;
}

function jellyTexture(frame) {
  const { c, ctx } = canvas(48, 56);
  ctx.translate(24, 16);
  const pul = 1 + (frame ? 0.08 : -0.05);
  ctx.strokeStyle = 'rgba(255,170,220,.75)'; ctx.lineWidth = 2;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath(); ctx.moveTo(k * 5, 2); ctx.quadraticCurveTo(k * 5 + (frame ? 4 : -4) * (k % 2 ? 1 : -1), 14, k * 4, 26); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,150,210,.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 15 * pul, 12 / pul, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-4, -6, 4, 2.5, -0.3, 0, Math.PI * 2); ctx.fill();
  return c;
}

/* ---------- Objects ---------- */
function pearlTexture(r) {
  const s = r * 2 + 4;
  const { c, ctx } = canvas(s, s);
  const x = s / 2, y = s / 2;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.6, '#F6EFE2'); g.addColorStop(1, '#D9CDBB');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  return c;
}

function starTexture(active) {
  const { c, ctx } = canvas(56, 56);
  ctx.translate(28, 28);
  if (active) {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    g.addColorStop(0, 'rgba(255,170,130,.6)'); g.addColorStop(1, 'rgba(255,170,130,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = active ? '#FF8E6B' : '#E9C9A6'; ctx.strokeStyle = active ? '#D2603F' : '#CBA57E'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.5 : 11, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  return c;
}

function buoyTexture() {
  const { c, ctx } = canvas(40, 40);
  ctx.translate(20, 20);
  ctx.fillStyle = '#E8563F'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFF6E8'; ctx.fillRect(-16, -4, 32, 8);
  ctx.strokeStyle = '#B23F2C'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
  return c;
}

function glowTexture() {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return c;
}

function cloudTexture(col = '#FFFFFF') {
  const { c, ctx } = canvas(140, 50);
  ctx.translate(60, 30);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 14, 0, 0, Math.PI * 2); ctx.ellipse(30, -8, 30, 14, 0, 0, Math.PI * 2); ctx.ellipse(-28, -4, 24, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

// Montaña de conchas (el Acaparador a lo lejos). Semilla fija para que siempre se vea igual.
export const MOUNT_SHELLS = (() => {
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const a = [];
  for (let i = 0; i < 34; i++) {
    const x = (r() - 0.5) * 400, top = -190 * (1 - Math.pow(Math.abs(x) / 230, 2));
    a.push({ x, y: top * (0.15 + r() * 0.8), s: 0.5 + r() * 0.7, rot: (r() - 0.5) * 1.2 });
  }
  return a;
})();

function shellStroke(ctx, m) {
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot); ctx.scale(m.s, m.s);
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-12, -15, 3, -24); ctx.quadraticCurveTo(13, -12, 12, 0); ctx.stroke();
  ctx.restore();
}

// Ya viene pintada (no se tiñe en Phaser porque el modo Canvas no aplica tintes). Origen en (280, 220).
export const MOUNT_COLORS = { beach: '#9184AE', rocks: '#7F7699', night: '#3E3858' };
function mountainTexture(col) {
  const { c, ctx } = canvas(560, 240);
  ctx.translate(280, 220);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-260, 10); ctx.bezierCurveTo(-200, -90, -120, -175, -20, -192); ctx.bezierCurveTo(90, -200, 175, -110, 260, 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2.4;
  for (const m of MOUNT_SHELLS) shellStroke(ctx, m);
  return c;
}

// La pinza del Acaparador asomando detrás de la montaña (cierre del Mundo 1). Origen en la base.
function mountClawTexture() {
  const { c, ctx } = canvas(120, 240);
  ctx.translate(40, 230);
  ctx.fillStyle = '#4E3F67';
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.bezierCurveTo(-46, -100, -60, -170, -20, -220); ctx.bezierCurveTo(-4, -240, 24, -230, 30, -206);
  ctx.bezierCurveTo(10, -210, -6, -190, 2, -168); ctx.bezierCurveTo(20, -190, 46, -190, 54, -166); ctx.bezierCurveTo(30, -160, 18, -120, 30, 0); ctx.closePath(); ctx.fill();
  return c;
}

// Pinza grande: con brazo (Mundo 3) o sola, barriendo el suelo (jefe del Mundo 6).
function clawTexture(closed, arm) {
  const { c, ctx } = canvas(520, 170);
  ctx.translate(96, 85);
  ctx.fillStyle = '#3A2C52'; ctx.strokeStyle = '#1E1530'; ctx.lineWidth = 3;
  ctx.beginPath();
  if (arm) { ctx.moveTo(420, -60); ctx.bezierCurveTo(200, -80, 120, -70, 60, -40); ctx.lineTo(60, 40); ctx.bezierCurveTo(120, 70, 200, 80, 420, 60); ctx.closePath(); }
  else { ctx.moveTo(110, -36); ctx.bezierCurveTo(90, -50, 70, -46, 60, -40); ctx.lineTo(60, 40); ctx.bezierCurveTo(70, 46, 90, 50, 110, 36); ctx.quadraticCurveTo(124, 0, 110, -36); ctx.closePath(); }
  ctx.fill();
  const o = closed ? 0.05 : 0.5;
  ctx.save(); ctx.translate(60, -10); ctx.rotate(-o);
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.bezierCurveTo(-50, -40, -90, -20, -96, 4); ctx.bezierCurveTo(-60, -6, -30, -4, 0, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(60, 10); ctx.rotate(o);
  ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-46, 36, -80, 20, -86, -2); ctx.bezierCurveTo(-56, 6, -28, 4, 0, -10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  return c;
}

// Cuerpo del Acaparador en la arena del Mundo 6. La textura empieza en el punto (4100, 80) del mundo.
export const BOSS_ORIGIN = { x: 4100, y: 80 };
function bossTexture() {
  const { c, ctx } = canvas(300, 400);
  ctx.translate(-BOSS_ORIGIN.x, -BOSS_ORIGIN.y);
  ctx.fillStyle = '#5A4C78';
  ctx.beginPath(); ctx.moveTo(4100, 470); ctx.bezierCurveTo(4096, 300, 4130, 130, 4250, 100); ctx.bezierCurveTo(4330, 84, 4380, 120, 4400, 170); ctx.lineTo(4400, 470); ctx.closePath(); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.moveTo(4100, 470); ctx.bezierCurveTo(4096, 300, 4130, 130, 4250, 100); ctx.bezierCurveTo(4330, 84, 4380, 120, 4400, 170); ctx.lineTo(4400, 470); ctx.closePath(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2.4;
  for (const m of MOUNT_SHELLS) shellStroke(ctx, { ...m, x: 4265 + m.x * 0.55, y: 440 + m.y * 1.5 });
  ctx.restore();
  // ojo pequeño, siempre entrecerrado
  ctx.fillStyle = '#2B2140'; ctx.beginPath(); ctx.ellipse(4215, 222, 14, 8, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,120,.8)'; ctx.beginPath(); ctx.ellipse(4215, 223, 8, 2.5, -0.2, 0, Math.PI * 2); ctx.fill();
  return c;
}

// Haz de luz de los ojos del Acaparador (Mundo 5). Origen arriba al centro.
export const BEAM_LEN = 720;
function beamTexture() {
  const half = 0.13, w = Math.ceil(Math.sin(half) * BEAM_LEN * 2) + 8;
  const { c, ctx } = canvas(w, BEAM_LEN);
  const g = ctx.createLinearGradient(0, 0, 0, BEAM_LEN);
  g.addColorStop(0, 'rgba(255,214,130,.3)'); g.addColorStop(1, 'rgba(255,214,130,.08)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2 + Math.sin(half) * BEAM_LEN, Math.cos(half) * BEAM_LEN);
  ctx.lineTo(w / 2 - Math.sin(half) * BEAM_LEN, Math.cos(half) * BEAM_LEN);
  ctx.closePath(); ctx.fill();
  return c;
}

// Oscuridad de las profundidades: transparente al centro. Radio 512 = luz de 250 (se escala con lightR).
function darkTexture() {
  const { c, ctx } = canvas(1024, 1024);
  const g = ctx.createRadialGradient(512, 512, 87.5, 512, 512, 400);
  g.addColorStop(0, 'rgba(2,10,22,0)'); g.addColorStop(0.55, 'rgba(2,10,22,.78)'); g.addColorStop(1, 'rgba(2,10,22,.95)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
  return c;
}

/* ---------- Glifos en la arena (sin texto: solo la tecla o el botón) ---------- */
export const GLYPH_KINDS = ['move', 'jump', 'drop', 'swap', 'step', 'double', 'glide', 'hide', 'throw'];
function glyphTexture(k, touch) {
  const { c, ctx } = canvas(160, 80);
  ctx.translate(80, 30);
  const col = 'rgba(110,82,46,.62)';
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.font = '700 15px Fredoka, ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const keyBox = (x, y, w, h, label) => { rr(ctx, x, y, w, h, 7); ctx.stroke(); if (label) ctx.fillText(label, x + w / 2, y + h / 2 + 1); };
  const circ = (x, label) => { ctx.beginPath(); ctx.arc(x, 12, 12, 0, Math.PI * 2); ctx.stroke(); if (label) ctx.fillText(label, x, 13); };
  const mini = (x, y, sc = 0.55) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-13, -16, 4, -25); ctx.quadraticCurveTo(14, -12, 12, 0); ctx.quadraticCurveTo(0, 3, -12, 0); ctx.stroke();
    ctx.restore();
  };
  const arrow = (x1, x2) => { ctx.beginPath(); ctx.moveTo(x1, 12); ctx.lineTo(x2, 12); ctx.moveTo(x2 - 4, 8); ctx.lineTo(x2, 12); ctx.lineTo(x2 - 4, 16); ctx.stroke(); };
  const actKey = (x) => { if (touch) { circ(x + 12, ''); mini(x + 12, 20, 0.45); } else keyBox(x, 0, 26, 24, 'X'); };
  if (k === 'move') { if (touch) { circ(-16, '◀'); circ(16, '▶'); } else { keyBox(-32, 0, 28, 24, '←'); keyBox(4, 0, 28, 24, '→'); } }
  else if (k === 'jump') { if (touch) circ(0, '▲'); else { keyBox(-40, 0, 80, 24, ''); ctx.beginPath(); ctx.moveTo(-18, 10); ctx.lineTo(-18, 15); ctx.lineTo(18, 15); ctx.lineTo(18, 10); ctx.stroke(); } }
  else if (k === 'drop') { actKey(-30); arrow(4, 14); mini(28, 22); }
  else if (k === 'swap') { actKey(-46); mini(-6, 22); arrow(8, 22); mini(38, 22); }
  else if (k === 'step') {
    ctx.beginPath(); ctx.moveTo(40, 30); ctx.lineTo(40, -2); ctx.lineTo(62, -2); ctx.stroke();
    mini(24, 30, 0.6);
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(-30, 28); ctx.quadraticCurveTo(-6, 4, 20, 14); ctx.quadraticCurveTo(28, 0, 30, 10); ctx.quadraticCurveTo(32, -8, 46, -8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(42, -12); ctx.lineTo(47, -8); ctx.lineTo(42, -4); ctx.stroke();
  } else if (k === 'double') {
    if (touch) circ(-14, '▲'); else keyBox(-44, 0, 56, 24, '');
    ctx.beginPath(); ctx.arc(26, 16, 7, Math.PI, 0); ctx.moveTo(40, 16); ctx.arc(47, 16, 7, Math.PI, 0); ctx.stroke();
  } else if (k === 'glide') {
    if (touch) circ(-14, '▲'); else { keyBox(-48, 0, 60, 24, ''); ctx.beginPath(); ctx.moveTo(-34, 12); ctx.lineTo(-2, 12); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(18, 6); ctx.quadraticCurveTo(32, -4, 46, 6); ctx.moveTo(18, 6); ctx.lineTo(32, 22); ctx.lineTo(46, 6); ctx.stroke();
  } else if (k === 'hide') {
    mini(-22, 26, 0.75); ctx.beginPath(); ctx.arc(-14, 22, 1.8, 0, Math.PI * 2); ctx.arc(-9, 22, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(touch ? '◀ ▶' : '← →', 22, 13);
    ctx.beginPath(); ctx.moveTo(4, 24); ctx.lineTo(40, 2); ctx.stroke();
  } else if (k === 'throw') {
    actKey(-50);
    mini(-6, 28, 0.6);
    ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(2, 16); ctx.quadraticCurveTo(26, -26, 50, -8); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.ellipse(60, -8, 9, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(60, -8, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

/* ---------- Íconos de los botones táctiles ---------- */
function iconTexture(kind) {
  const { c, ctx } = canvas(64, 64);
  ctx.translate(32, 32);
  ctx.fillStyle = 'rgba(38,48,52,.85)';
  ctx.beginPath();
  if (kind === 'left') { ctx.moveTo(-22, 0); ctx.lineTo(-2, -18); ctx.lineTo(-2, -7); ctx.lineTo(22, -7); ctx.lineTo(22, 7); ctx.lineTo(-2, 7); ctx.lineTo(-2, 18); }
  else if (kind === 'right') { ctx.moveTo(22, 0); ctx.lineTo(2, -18); ctx.lineTo(2, -7); ctx.lineTo(-22, -7); ctx.lineTo(-22, 7); ctx.lineTo(2, 7); ctx.lineTo(2, 18); }
  else if (kind === 'jump') { ctx.moveTo(0, -22); ctx.lineTo(18, -2); ctx.lineTo(7, -2); ctx.lineTo(7, 22); ctx.lineTo(-7, 22); ctx.lineTo(-7, -2); ctx.lineTo(-18, -2); }
  else if (kind === 'act') {
    ctx.moveTo(-20, 16); ctx.quadraticCurveTo(-22, -6, 4, -22); ctx.quadraticCurveTo(22, -4, 20, 16); ctx.quadraticCurveTo(0, 22, -20, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236,240,240,.95)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12, 8); ctx.quadraticCurveTo(0, 12, 13, 7); ctx.moveTo(-8, -2); ctx.quadraticCurveTo(2, 1, 11, -3); ctx.stroke();
    return c;
  }
  ctx.closePath(); ctx.fill();
  return c;
}

// Arma todas las texturas. add(nombre, canvas) las registra en Phaser.
export function buildArt(add) {
  for (const t of SHELL_TYPES) add(`shell-${t}`, shellTexture(t));
  for (const v of ['red', 'naked', 'old']) for (let f = 0; f < CRAB_FRAMES; f++) add(`crab-${v}-${f}`, crabTexture(v, f));
  add('peek', peekTexture());
  add('flea', fleaTexture());
  [-0.6, 0.2, 1].forEach((fl, i) => add(`gull-${i}`, gullTexture(fl)));
  [0, 1].forEach((f) => add(`urchin-${f}`, urchinTexture(f)));
  [0, 1].forEach((f) => add(`jelly-${f}`, jellyTexture(f)));
  add('pearl', pearlTexture(7));
  add('pearl-big', pearlTexture(16));
  add('star-on', starTexture(true));
  add('star-off', starTexture(false));
  add('buoy', buoyTexture());
  add('glow', glowTexture());
  add('cloud', cloudTexture());
  add('cloud-dusk', cloudTexture('#DCC8E6'));
  add('cloud-night', cloudTexture('#7878AA'));
  for (const [k, col] of Object.entries(MOUNT_COLORS)) add(`mount-${k}`, mountainTexture(col));
  add('mount-claw', mountClawTexture());
  add('claw-open', clawTexture(false, false));
  add('claw-closed', clawTexture(true, false));
  add('claw-arm-open', clawTexture(false, true));
  add('claw-arm-closed', clawTexture(true, true));
  add('boss', bossTexture());
  add('beam', beamTexture());
  add('dark', darkTexture());
  for (const k of GLYPH_KINDS) { add(`glyph-${k}-key`, glyphTexture(k, false)); add(`glyph-${k}-touch`, glyphTexture(k, true)); }
  for (const k of ['left', 'right', 'jump', 'act']) add(`icon-${k}`, iconTexture(k));
}
