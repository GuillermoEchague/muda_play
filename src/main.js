import Phaser from 'phaser';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { W, H } from './core/constants.js';
import { Boot } from './scenes/Boot.js';
import { Title } from './scenes/Title.js';
import { Game } from './scenes/Game.js';
import { LevelEnd } from './scenes/LevelEnd.js';
import { unlockAudio } from './audio/sfx.js';
import { setupPWA } from './pwa.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0C2A30',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 4 },
  render: { antialias: true, roundPixels: false },
  scene: [Boot, Title, Game, LevelEnd],
});

// El sonido se activa con el primer toque o tecla (regla de los navegadores).
const unlock = () => unlockAudio();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);

setupPWA();

// Para probar desde la consola del navegador
window.__game = game;
