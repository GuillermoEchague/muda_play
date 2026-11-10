import Phaser from 'phaser';
import { W, H } from '../core/constants.js';
import { World } from '../core/world.js';
import { LEVELS } from '../core/levels.js';
import { loadProgress, completedCount } from '../core/progress.js';
import { WorldView } from './world-view.js';
import { text, createMenu, C } from './ui.js';
import { settings, saveSettings, store } from '../settings.js';
import { setSound, setSea } from '../audio/sfx.js';
import { canInstall, needsIosHelp, promptInstall, showIosHelp, onInstallChange, isStandalone, isIOS, toast } from '../pwa.js';
import { isTouchDevice } from '../input/touch.js';

// Pantalla de título: la playa del Mundo 1 de fondo, el menú principal y la lista de mundos.
export class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.progress = loadProgress(store);
    this.touchMode = isTouchDevice();
    setSea(0.6);

    // Fondo: la playa, con la cámara paseando despacio.
    this.world = new World(0);
    this.world.state = 'play';
    this.world.cardT = 99;
    this.world.P.x = 760; this.world.P.y = 440 - this.world.P.h; this.world.P.tumble = 0;
    this.view = new WorldView(this, this.world, { hud: false, touch: this.touchMode });

    this.shade = this.add.graphics().setScrollFactor(0).setDepth(50);

    text(this, W / 2, 82, 'Muda', { size: 112, weight: '700', origin: [0.5, 0.5] }).setScrollFactor(0).setDepth(51);
    text(this, W / 2, 152, 'Para crecer hay que soltar la casa que te queda chica.', { size: 20, weight: '500', color: C.papel, origin: [0.5, 0.5] }).setScrollFactor(0).setDepth(51);

    const done = completedCount(this.progress);
    const next = Math.min(done, LEVELS.length - 1);
    const yes = (v) => (v ? 'SÍ' : 'NO');
    this.main = createMenu(this, {
      x: W / 2, y: 236, gap: 42, size: 26, depth: 52,
      items: [
        { label: done === 0 ? 'JUGAR' : `SEGUIR: MUNDO ${next + 1}`, action: () => this.go(next) },
        { label: 'ELEGIR MUNDO', action: () => this.showWorlds(true) },
        { label: () => `SONIDO: ${yes(settings.sound)}`, action: () => { setSound(!settings.sound); saveSettings(); } },
        { label: 'INSTALAR JUEGO', hidden: () => !canInstall(), action: () => promptInstall() },
        { label: 'CÓMO INSTALAR', hidden: () => canInstall() || !needsIosHelp(), action: () => showIosHelp(true) },
        // Solo en la app instalada o en pantalla completa (en una pestaña normal cerraría la pestaña).
        { label: () => (this.confirmExit ? '¿SALIR? TOCA OTRA VEZ' : 'SALIR'), hidden: () => !isStandalone() && !this.scale.isFullscreen, action: () => this.exitGame() },
      ],
    });
    this.main.nodes.forEach((n) => n.setScrollFactor(0));

    const best = (i) => {
      const b = this.progress.best[i];
      return b ? `  ✓ ${b.pearls}/${b.max}` : '';
    };
    this.worlds = createMenu(this, {
      x: W / 2, y: 222, gap: 38, size: 22, depth: 52,
      onBack: () => this.showWorlds(false),
      items: [
        ...LEVELS.map((L, i) => ({ label: `${L.n} · ${L.name}${best(i)}`, action: () => this.go(i) })),
        { label: 'VOLVER', action: () => this.showWorlds(false) },
      ],
    });
    this.worlds.nodes.forEach((n) => n.setScrollFactor(0));
    this.worlds.setVisible(false);

    const off = onInstallChange(() => { this.main.rebuild(); this.main.nodes.forEach((n) => n.setScrollFactor(0)); });
    this.events.once('shutdown', off);
    this.scale.on('enterfullscreen', this.lockLandscape, this);
    this.scale.on('leavefullscreen', this.rebuildMain, this);
    this.events.once('shutdown', () => { this.scale.off('enterfullscreen', this.lockLandscape, this); this.scale.off('leavefullscreen', this.rebuildMain, this); });

    const hint = this.touchMode ? 'Toca una opción para empezar' : 'Flechas: moverse · Espacio: saltar · X: concha · Enter: elegir';
    text(this, W / 2, H - 22, hint, { size: 16, weight: '500', color: C.tenue, origin: [0.5, 0.5] }).setScrollFactor(0).setDepth(51);
  }

  rebuildMain() { if (this.main.alive) { this.main.rebuild(); this.main.nodes.forEach((n) => n.setScrollFactor(0)); } }

  // Panel detrás del menú, del alto justo para las opciones que se ven.
  drawShade() {
    const menu = this.worlds.active ? this.worlds : this.main;
    const n = menu.nodes.length, gap = this.worlds.active ? 38 : 42, top = (this.worlds.active ? 222 : 236) - 30;
    const key = `${this.worlds.active}-${n}`;
    if (key === this.shadeKey) return;
    this.shadeKey = key;
    this.shade.clear().fillStyle(0x0C2A30, 0.18).fillRect(0, 0, W, H);
    this.shade.fillStyle(0x0C2A30, 0.62).fillRoundedRect(W / 2 - 250, top, 500, (n - 1) * gap + 60, 26);
  }

  lockLandscape() {
    try { const o = window.screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch { /* no se puede en este navegador */ }
  }

  showWorlds(v) {
    this.main.setVisible(!v);
    this.worlds.setVisible(v);
  }

  go(level) {
    // En el celular, pantalla completa al empezar (en la app instalada ya lo es).
    if (this.touchMode && !isStandalone() && !this.scale.isFullscreen) {
      try { this.scale.startFullscreen(); } catch { /* algunos navegadores no lo permiten */ }
    }
    this.scene.start('Game', { level });
  }

  exitGame() {
    // Primer toque: pide confirmar, para no salir por accidente.
    if (!this.confirmExit) {
      this.confirmExit = true;
      this.time.delayedCall(2500, () => { this.confirmExit = false; if (this.main.alive) this.main.refresh(); });
      return;
    }
    this.confirmExit = false;
    // En el navegador a pantalla completa: solo se sale de la pantalla completa.
    if (!isStandalone()) {
      this.scale.stopFullscreen();
      this.time.delayedCall(200, () => this.rebuildMain());
      return;
    }
    // App instalada: se intenta cerrar la ventana. iPhone no deja que una página se cierre sola.
    window.close();
    setTimeout(() => {
      toast(isIOS()
        ? 'Para salir, desliza hacia arriba desde el borde inferior de la pantalla.'
        : 'Para salir, usa el botón de inicio o el de atrás de tu teléfono.');
    }, 400);
  }

  update(time, delta) {
    const w = this.world;
    w.T += delta / 1000;
    w.camX = 260 + Math.sin(w.T * 0.08) * 260;
    w.P.walk = 0;
    this.drawShade();
    this.view.render();
    if (this.worlds.active) this.worlds.update(); else this.main.update();
  }
}
