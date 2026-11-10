import Phaser from 'phaser';
import { W, H } from '../core/constants.js';
import { LEVELS } from '../core/levels.js';
import { loadProgress, recordResult } from '../core/progress.js';
import { text, createMenu, C } from './ui.js';
import { store } from '../settings.js';

// Resultado del mundo, encima de la última imagen del juego.
export class LevelEnd extends Phaser.Scene {
  constructor() { super('LevelEnd'); }

  init(data) { this.data_ = data; }

  create() {
    const { summary: s, endText } = this.data_;
    const progress = loadProgress(store);
    const record = recordResult(progress, s, store);
    const last = s.level === LEVELS.length - 1;
    const L = LEVELS[s.level];

    this.add.rectangle(0, 0, W, H, 0x07202A, 0.8).setOrigin(0).setInteractive();
    text(this, W / 2, 62, last ? 'Fin de Muda' : `Mundo ${L.n} completado`, { size: 46, weight: '700', origin: [0.5, 0.5] });
    text(this, W / 2, 106, last ? 'Libertad para vivir' : L.name, { size: 22, weight: '500', color: C.tenue, origin: [0.5, 0.5] });

    const stats = [
      ['PERLAS', `${s.pearls} / ${s.maxPearls}`],
      ...(s.buoy === null ? [] : [['BOYA', `${s.buoy}%`]]),
      ['MUDAS', `${s.mudas}`],
      ['CAÍDAS', `${s.caidas}`],
    ];
    const colW = 150, x0 = W / 2 - ((stats.length - 1) * colW) / 2;
    stats.forEach(([k, v], i) => {
      text(this, x0 + i * colW, 156, k, { size: 14, weight: '600', color: C.tenue, origin: [0.5, 0.5] });
      text(this, x0 + i * colW, 186, v, { size: 30, weight: '600', origin: [0.5, 0.5] });
    });
    if (record) text(this, W / 2, 226, '¡Nuevo récord de perlas!', { size: 18, weight: '600', color: C.perla, origin: [0.5, 0.5] });
    text(this, W / 2, 274, endText, { size: 19, weight: '500', origin: [0.5, 0.5], align: 'center', wrap: 640 });

    const hasNext = !last;
    this.menu = createMenu(this, {
      x: W / 2, y: 356, gap: 46, size: 26, depth: 5,
      items: [
        { label: `SIGUIENTE: ${hasNext ? LEVELS[s.level + 1].name.toUpperCase() : ''}`, hidden: () => !hasNext, action: () => this.go(s.level + 1) },
        { label: 'REPETIR MUNDO', action: () => this.go(s.level) },
        { label: 'MENÚ', action: () => { this.scene.stop('Game'); this.scene.start('Title'); } },
      ],
    });
  }

  go(level) {
    this.scene.stop();
    this.scene.get('Game').scene.restart({ level });
  }

  update() { this.menu.update(); }
}
