import Phaser from 'phaser';
import { W, H } from '../core/constants.js';
import { buildArt } from '../gfx/art.js';
import { text, FONT } from './ui.js';

// Carga la fuente y genera todas las texturas del juego.
// Cuando tengas imágenes reales, cárgalas en preload() con this.load.image / this.load.atlas
// usando las mismas claves ('shell-espiral', 'crab-red-0', 'flea'…) y quita lo que se genera aquí.
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  async create() {
    const msg = text(this, W / 2, H / 2, 'Cargando…', { size: 24, origin: [0.5, 0.5] });
    const bar = this.add.graphics();
    bar.fillStyle(0xFDF7EA, 0.2).fillRoundedRect(W / 2 - 120, H / 2 + 34, 240, 10, 5);
    try {
      await Promise.race([
        Promise.all(['500', '600', '700'].map((wt) => document.fonts.load(`${wt} 24px Fredoka`))),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch { /* si la fuente falla, se usa la de respaldo */ }
    bar.fillStyle(0x7FE0D4, 1).fillRoundedRect(W / 2 - 120, H / 2 + 34, 120, 10, 5);

    buildArt((key, canvas) => { if (!this.textures.exists(key)) this.textures.addCanvas(key, canvas); });
    bar.fillStyle(0x7FE0D4, 1).fillRoundedRect(W / 2 - 120, H / 2 + 34, 240, 10, 5);
    msg.setText('Listo');
    this.registry.set('font', FONT);
    this.scene.start('Title');
  }
}
