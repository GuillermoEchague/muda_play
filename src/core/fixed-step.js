import { STEP_MS } from './constants.js';

// La lógica avanza siempre a 60 cuadros por segundo, aunque la pantalla sea de 120 Hz o vaya lenta.
// Así un salto mide lo mismo en cualquier dispositivo.
export class FixedStep {
  constructor(stepFn) { this.stepFn = stepFn; this.acc = 0; }
  update(delta) {
    this.acc += Math.min(delta, 100);
    let n = 0;
    while (this.acc >= STEP_MS && n < 5) { this.stepFn(); this.acc -= STEP_MS; n++; }
    if (n === 5) this.acc = 0; // si el equipo se atrasa mucho, no intentar recuperar todo
    return n;
  }
  reset() { this.acc = 0; }
}
