import Phaser from 'phaser';
import { W, H, STEP_MS } from '../core/constants.js';
import { World } from '../core/world.js';
import { FixedStep } from '../core/fixed-step.js';
import { WorldView } from './world-view.js';
import { dispatchEvents } from './events.js';
import { blank, merge } from '../input/controls.js';
import { KeyboardInput } from '../input/keyboard.js';
import { readPad, padEdges } from '../input/gamepad.js';
import { TouchControls, isTouchDevice } from '../input/touch.js';
import { text, createMenu, roundButton, onKeyOnce, C } from './ui.js';
import { settings, saveSettings } from '../settings.js';
import { setSound, setSea } from '../audio/sfx.js';

// Un mundo en juego. La lógica vive en src/core; esta escena junta los controles, avanza el core
// a 60 cuadros por segundo y le pide a WorldView que lo dibuje.
export class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.level = data.level ?? 0; }

  create() {
    this.touchMode = isTouchDevice();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.world = new World(this.level);
    this.view = new WorldView(this, this.world, { touch: this.touchMode, reduceMotion: reduce });
    this.keys = new KeyboardInput(this);
    this.touch = this.touchMode ? new TouchControls(this) : null;
    this.loop = new FixedStep(() => this.stepOnce());
    this.paused = false;
    this.ended = false;
    setSea(1);

    // Botones de esquina: pausa y salir (con mouse o con el dedo).
    const pauseIcon = (g, x, y) => { g.lineBetween(x - 5, y - 8, x - 5, y + 8); g.lineBetween(x + 5, y - 8, x + 5, y + 8); };
    const exitIcon = (g, x, y) => { g.lineBetween(x - 7, y - 7, x + 7, y + 7); g.lineBetween(x + 7, y - 7, x - 7, y + 7); };
    this.pauseBtn = roundButton(this, W - 86, 34, { icon: pauseIcon, onPress: () => this.togglePause() });
    this.exitBtn = roundButton(this, W - 34, 34, { icon: exitIcon, fill: 0x962C3A, alpha: 0.8, onPress: () => this.askExit() });

    onKeyOnce(this, (e) => {
      if (e.code === 'KeyM') { setSound(!settings.sound); saveSettings(); if (this.pauseMenu.active) this.pauseMenu.refresh(); return; }
      if (e.code !== 'Escape' && e.code !== 'KeyP') return;
      if (this.exitMenu.active) this.closeExit();
      else if (!this.pauseMenu.active || e.code === 'KeyP') this.togglePause();
    });
    const autoPause = () => { if (!this.paused && !this.ended) this.togglePause(); };
    const onVis = () => { if (document.hidden) autoPause(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', autoPause);
    this.events.once('shutdown', () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', autoPause);
    });
    this.portrait = matchMedia('(orientation: portrait)');
    this.buildPause();
    this.buildExit();
  }

  overlay(title, sub) {
    const bg = this.add.rectangle(0, 0, W, H, 0x07202A, 0.82).setOrigin(0).setScrollFactor(0).setDepth(80).setVisible(false);
    const t = text(this, W / 2, 120, title, { size: 56, weight: '700', origin: [0.5, 0.5] }).setScrollFactor(0).setDepth(81).setVisible(false);
    const parts = [bg, t];
    if (sub) parts.push(text(this, W / 2, 178, sub, { size: 20, weight: '500', color: C.tenue, origin: [0.5, 0.5] }).setScrollFactor(0).setDepth(81).setVisible(false));
    // El fondo se traga los toques para que no lleguen al juego.
    bg.setInteractive();
    return parts;
  }

  buildPause() {
    const yes = (v) => (v ? 'SÍ' : 'NO');
    this.pauseParts = this.overlay('Pausa');
    this.pauseMenu = createMenu(this, {
      x: W / 2, y: 230, gap: 48, size: 28, depth: 81,
      onBack: () => this.togglePause(),
      items: [
        { label: 'SEGUIR', action: () => this.togglePause() },
        { label: 'REINICIAR MUNDO', action: () => this.scene.restart({ level: this.level }) },
        { label: () => `SONIDO: ${yes(settings.sound)}`, action: () => { setSound(!settings.sound); saveSettings(); } },
        { label: 'SALIR AL MENÚ', action: () => this.scene.start('Title') },
      ],
    });
    this.pauseMenu.nodes.forEach((n) => n.setScrollFactor(0));
    this.pauseMenu.setVisible(false);
  }

  buildExit() {
    this.exitParts = this.overlay('¿Salir del mundo?', 'Vuelves al menú y pierdes el avance de este mundo.');
    this.exitMenu = createMenu(this, {
      x: W / 2, y: 260, gap: 54, size: 30, depth: 81,
      onBack: () => this.closeExit(),
      items: [
        { label: 'SALIR', action: () => this.scene.start('Title') },
        { label: 'SEGUIR JUGANDO', action: () => this.closeExit() },
      ],
    });
    this.exitMenu.nodes.forEach((n) => n.setScrollFactor(0));
    this.exitMenu.setVisible(false);
  }

  show(parts, menu, v) {
    parts.forEach((p) => p.setVisible(v));
    menu.setVisible(v);
    if (v) menu.index = 0;
  }

  togglePause() {
    if (this.ended || this.exitMenu.active) return;
    this.paused = !this.paused;
    this.show(this.pauseParts, this.pauseMenu, this.paused);
    setSea(this.paused ? 0.3 : 1);
    this.resetInput();
  }

  askExit() {
    if (this.ended) { this.scene.stop('LevelEnd'); this.scene.start('Title'); return; }
    if (this.exitMenu.active) return;
    this.wasPaused = this.paused;
    this.paused = true;
    this.show(this.pauseParts, this.pauseMenu, false);
    this.show(this.exitParts, this.exitMenu, true);
    this.resetInput();
  }

  closeExit() {
    this.show(this.exitParts, this.exitMenu, false);
    if (this.wasPaused) this.show(this.pauseParts, this.pauseMenu, true);
    else this.paused = false;
    this.resetInput();
  }

  resetInput() {
    if (this.touch) this.touch.reset();
    this.keys.reset();
    this.loop.reset();
  }

  controls() {
    const c = merge(merge(blank(), this.keys.read()), readPad());
    if (this.touch) merge(c, this.touch.read());
    return c;
  }

  stepOnce() {
    this.world.step(this.controls());
    const events = dispatchEvents(this.world, this.view);
    this.view.tickFx(STEP_MS / 1000);
    if (events.some((e) => e.type === 'done')) this.finish();
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    if (this.touch) this.touch.setVisible(false);
    this.pauseBtn.setVisible(false);
    this.scene.launch('LevelEnd', { summary: this.world.summary(), endText: this.world.lv.endText });
  }

  update(time, delta) {
    if (this.touch && this.portrait.matches && !this.paused && !this.ended) this.togglePause();
    if (this.paused) {
      if (this.exitMenu.active) this.exitMenu.update(); else this.pauseMenu.update();
    } else {
      if (padEdges().start && !this.ended) this.togglePause();
      if (!this.ended) this.loop.update(delta);
    }
    this.view.render();
    if (this.touch && !this.ended) {
      this.touch.setVisible(!this.paused);
      this.touch.draw();
    }
  }
}
