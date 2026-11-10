// Botones táctiles estilo arcade, dibujados dentro de Phaser encima del juego:
// cruceta ◀ ▶ abajo a la izquierda (se puede deslizar el dedo de una flecha a la otra),
// saltar ▲ abajo a la derecha y, en diagonal, el botón de concha más pequeño.
import { W, H } from '../core/constants.js';
import { blank } from './controls.js';

export const isTouchDevice = () => {
  try { return matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches); }
  catch { return false; }
};

const R = 46; // radio de los botones grandes (en píxeles del juego)
export const BUTTONS = {
  left: { x: 72, y: H - 70, r: R },
  right: { x: 184, y: H - 70, r: R },
  jump: { x: W - 72, y: H - 70, r: R },
  act: { x: W - 178, y: H - 132, r: 34 },
};
const DPAD = { x: 0, y: H - 190, w: 280, h: 190, mid: (BUTTONS.left.x + BUTTONS.right.x) / 2 };

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.dir = new Map(); // pointerId → 'left' | 'right'
    this.held = new Map(); // pointerId → 'jump' | 'act'
    this.tapped = new Set(); // toques rápidos que se sueltan antes del siguiente cuadro
    this.visible = true;
    scene.input.addPointer(3);

    this.g = scene.add.graphics().setScrollFactor(0).setDepth(60);
    this.icons = {};
    for (const k of Object.keys(BUTTONS)) {
      const b = BUTTONS[k];
      this.icons[k] = scene.add.image(b.x, b.y, `icon-${k}`).setScrollFactor(0).setDepth(61).setDisplaySize(b.r * 1.15, b.r * 1.15);
    }

    const inCircle = (p, b, pad = 10) => Math.hypot(p.x - b.x, p.y - b.y) <= b.r + pad;
    const inDpad = (p) => p.x >= DPAD.x && p.x <= DPAD.x + DPAD.w && p.y >= DPAD.y && p.y <= DPAD.y + DPAD.h;
    const side = (p) => (p.x < DPAD.mid ? 'left' : 'right');

    this.onDown = (p) => {
      if (!this.visible) return;
      if (inCircle(p, BUTTONS.jump)) { this.held.set(p.id, 'jump'); this.tapped.add('jump'); return; }
      if (inCircle(p, BUTTONS.act)) { this.held.set(p.id, 'act'); this.tapped.add('act'); return; }
      if (inDpad(p)) { this.dir.set(p.id, side(p)); this.tapped.add(side(p)); }
    };
    this.onMove = (p) => { if (this.dir.has(p.id) && p.isDown) this.dir.set(p.id, side(p)); };
    this.onUp = (p) => { this.dir.delete(p.id); this.held.delete(p.id); };
    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);
    scene.events.once('shutdown', () => this.destroy());
  }

  pressed() {
    const s = new Set([...this.dir.values(), ...this.held.values()]);
    return s;
  }

  read() {
    const r = blank();
    for (const k of this.pressed()) r[k] = true;
    for (const k of this.tapped) r[k] = true;
    this.tapped.clear();
    return r;
  }

  draw() {
    const g = this.g.clear();
    if (!this.visible) return;
    const on = this.pressed();
    for (const [k, b] of Object.entries(BUTTONS)) {
      const down = on.has(k);
      const r = down ? b.r * 0.92 : b.r;
      g.fillStyle(0x000000, 0.14).fillCircle(b.x, b.y + 3, r);
      g.fillStyle(down ? 0xFFFFFF : 0xECF0F0, down ? 0.85 : 0.5).fillCircle(b.x, b.y, r);
      g.lineStyle(4, 0x2E3A3E, 0.55).strokeCircle(b.x, b.y, r);
      if (!down) g.lineStyle(4, 0x1E282C, 0.12).beginPath().arc(b.x, b.y, r - 5, 0.35, Math.PI - 0.35).strokePath();
      this.icons[k].setScale((down ? 0.92 : 1) * (b.r * 1.15) / 64);
    }
  }

  setVisible(v) {
    this.visible = v;
    Object.values(this.icons).forEach((i) => i.setVisible(v));
    if (!v) this.reset();
    this.draw();
  }

  reset() { this.dir.clear(); this.held.clear(); this.tapped.clear(); }

  destroy() {
    const i = this.scene.input;
    i.off('pointerdown', this.onDown); i.off('pointermove', this.onMove);
    i.off('pointerup', this.onUp); i.off('pointerupoutside', this.onUp);
  }
}
