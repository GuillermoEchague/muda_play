// Piezas de interfaz compartidas: textos y menús que se manejan con teclado, control o tocando la pantalla.
import Phaser from 'phaser';
// (Mismo sistema que la base Model_Phaser_Game, con la tipografía y los colores de Muda.)
import { play } from '../audio/sfx.js';
import { padEdges } from '../input/gamepad.js';

export const FONT = 'Fredoka, ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
export const C = {
  mar: 0x0C2A30, marHex: '#0C2A30', papel: '#FDF7EA', tenue: '#9FC9C2', concha: '#F7B9A8', perla: '#FFE59A', tinta: '#12302D',
};

// Phaser a veces entrega el mismo evento de teclado dos veces. Así cada oyente reacciona una sola vez por tecla.
export function onKeyOnce(scene, fn) {
  const seen = new WeakSet();
  const h = (e) => { if (seen.has(e)) return; seen.add(e); fn(e); };
  scene.input.keyboard.on('keydown', h);
  return () => scene.input.keyboard.off('keydown', h);
}

export function text(scene, x, y, str, { size = 20, color = C.papel, weight = '600', stroke = true, align = 'left', origin = [0, 0], wrap = 0 } = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: weight,
    color,
    align,
    stroke: stroke ? C.marHex : undefined,
    strokeThickness: stroke ? Math.max(3, Math.round(size / 6)) : 0,
    padding: { x: 4, y: 4 },
    wordWrap: wrap ? { width: wrap } : undefined,
    lineSpacing: 4,
  });
  t.setOrigin(origin[0], origin[1]);
  return t;
}

// Menú vertical. items: [{ label: string | () => string, action, hidden?: () => bool }]
export function createMenu(scene, { x, y, items, gap = 40, size = 24, onBack = null, depth = 0 }) {
  let sel = 0;
  let z = depth;
  const visible = () => items.filter((it) => !it.hidden || !it.hidden());
  const nodes = [];
  const label = (it) => (typeof it.label === 'function' ? it.label() : it.label);

  function build() {
    nodes.forEach((n) => n.destroy());
    nodes.length = 0;
    visible().forEach((it, i) => {
      const t = text(scene, x, y + i * gap, label(it), { size, origin: [0.5, 0.5] });
      // Zona de toque más grande que el texto, cómoda para el dedo.
      t.setInteractive(new Phaser.Geom.Rectangle(-40, -6, t.width + 80, t.height + 12), Phaser.Geom.Rectangle.Contains);
      t.input.cursor = 'pointer';
      t.on('pointerover', () => { sel = i; refresh(); });
      t.on('pointerup', () => { sel = i; refresh(); choose(); });
      t.item = it;
      t.setDepth(z);
      nodes.push(t);
    });
    if (sel >= nodes.length) sel = 0;
    refresh();
  }

  function refresh() {
    nodes.forEach((n, i) => {
      const on = i === sel;
      n.setText((on ? '› ' : '') + label(n.item) + (on ? ' ‹' : ''));
      n.setColor(on ? C.perla : C.papel);
    });
  }

  function move(d) {
    if (!nodes.length) return;
    sel = (sel + d + nodes.length) % nodes.length;
    play('blip');
    refresh();
  }

  function choose() {
    const n = nodes[sel];
    if (!n) return;
    play('select');
    n.item.action();
    if (api.alive) refresh();
  }

  let activatedAt = 0;
  const onKey = (e) => {
    if (!api.alive || !api.active) return;
    if (e.timeStamp && e.timeStamp <= activatedAt) return; // la misma tecla que abrió el menú no cuenta
    if (['ArrowUp', 'KeyW'].includes(e.code)) move(-1);
    else if (['ArrowDown', 'KeyS'].includes(e.code)) move(1);
    else if (['Enter', 'Space', 'KeyZ', 'KeyX'].includes(e.code)) choose();
    else if (e.code === 'Escape' && onBack) { play('blip'); onBack(); }
  };
  const offKey = onKeyOnce(scene, onKey);

  const api = {
    alive: true,
    active: true,
    get index() { return sel; },
    set index(v) { sel = v; refresh(); },
    nodes,
    rebuild: build,
    refresh,
    update() {
      if (!api.active) return;
      const e = padEdges();
      if (e.up) move(-1);
      if (e.down) move(1);
      if (e.a) choose();
      if (e.b && onBack) { play('blip'); onBack(); }
    },
    setVisible(v) {
      nodes.forEach((n) => n.setVisible(v));
      if (v && !api.active) activatedAt = performance.now();
      api.active = v;
    },
    destroy() {
      api.alive = false;
      offKey();
      nodes.forEach((n) => n.destroy());
    },
  };
  build();
  scene.events.once('shutdown', () => api.destroy());
  return api;
}

// Botón redondo de esquina (pausa, salir) que funciona con mouse y con el dedo.
export function roundButton(scene, x, y, { r = 22, fill = 0x0C2A30, alpha = 0.6, icon, depth = 70, onPress }) {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
  const draw = (down = false) => {
    g.clear().fillStyle(fill, down ? Math.min(1, alpha + 0.25) : alpha).fillCircle(x, y, r);
    g.lineStyle(3, 0xF4FBF9, 1);
    icon(g, x, y);
  };
  draw();
  const zone = scene.add.zone(x, y, r * 2 + 16, r * 2 + 16).setScrollFactor(0).setDepth(depth).setInteractive({ cursor: 'pointer' });
  zone.on('pointerdown', (p, lx, ly, ev) => { ev?.stopPropagation?.(); draw(true); });
  zone.on('pointerup', (p, lx, ly, ev) => { ev?.stopPropagation?.(); draw(false); onPress(); });
  zone.on('pointerout', () => draw(false));
  return { g, zone, setVisible(v) { g.setVisible(v); zone.setVisible(v); if (v) zone.setInteractive(); else zone.disableInteractive(); } };
}
