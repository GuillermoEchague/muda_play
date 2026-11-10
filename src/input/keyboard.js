import { blank } from './controls.js';

// Moverse: flechas o A/D · Saltar: Espacio, flecha arriba, W o Z · Concha: X, flecha abajo, S o K
const MAP = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  jump: ['SPACE', 'UP', 'W', 'Z'],
  act: ['X', 'DOWN', 'S', 'K'],
};

export class KeyboardInput {
  constructor(scene) {
    const kb = scene.input.keyboard;
    // Toques muy rápidos (apretar y soltar dentro del mismo cuadro) también cuentan.
    this.tapped = new Set();
    this.keys = {};
    for (const action in MAP) {
      this.keys[action] = MAP[action].map((name) => {
        const key = kb.addKey(name, true); // true: el navegador no hace scroll con Espacio ni flechas
        key.on('down', () => this.tapped.add(key));
        return key;
      });
    }
  }

  read() {
    const r = blank();
    for (const action in this.keys) if (this.keys[action].some((k) => k.isDown || this.tapped.has(k))) r[action] = true;
    this.tapped.clear();
    return r;
  }

  reset() {
    this.tapped.clear();
    for (const action in this.keys) for (const k of this.keys[action]) k.reset();
  }
}
