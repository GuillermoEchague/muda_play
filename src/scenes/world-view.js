// Dibuja un World del core con Phaser. Solo lee el estado: nunca cambia reglas.
import Phaser from 'phaser';
import { W, H } from '../core/constants.js';
import { ORIGIN, CRAB_FRAMES, BOSS_ORIGIN } from '../gfx/art.js';
import { FONT } from './ui.js';

const hex = (s) => parseInt(s.slice(1), 16);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  const ch = (n, s) => Math.round(lerp((n >> s) & 255, (B >> s) & 255, t)) << s;
  return ch(A, 16) | ch(A, 8) | ch(A, 0);
}
// Puntos de una curva cuadrática (Phaser Graphics no tiene quadraticCurveTo).
function quad(p0x, p0y, p1x, p1y, p2x, p2y, n = 10, out = []) {
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * p0x + 2 * u * t * p1x + t * t * p2x, y: u * u * p0y + 2 * u * t * p1y + t * t * p2y });
  }
  return out;
}

// Texturas de degradado vertical (cielo, fondo marino, amanecer), creadas una vez.
function gradTexture(scene, key, stops, h) {
  if (scene.textures.exists(key)) return key;
  const c = document.createElement('canvas');
  c.width = 4; c.height = h;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [p, col] of stops) g.addColorStop(p, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, h);
  scene.textures.addCanvas(key, c);
  return key;
}

export class WorldView {
  constructor(scene, world, { touch = false, reduceMotion = false, hud = true } = {}) {
    this.showHud = hud;
    this.scene = scene;
    this.w = world;
    this.lv = world.lv;
    this.touch = touch;
    this.reduce = reduceMotion;
    this.parts = [];
    this.shellImgs = new Map();
    this.enemyImgs = new Map();
    this.objs = [];
    const add = (o) => { this.objs.push(o); return o; };
    this.add = add;

    this.buildBackground();
    this.buildWater();
    this.buildTerrain();

    const s = scene;
    this.dyn = add(s.add.graphics().setDepth(11));
    this.glyphs = this.lv.glyphs.map((g) => add(s.add.image(g.x, g.top + 16, `glyph-${g.k}-${touch ? 'touch' : 'key'}`).setOrigin(...ORIGIN.glyph).setDepth(12)));
    this.stars = this.lv.cps.map((cp) => add(s.add.image(cp.x, cp.y - 9, 'star-off').setDepth(12)));
    this.goalG = add(s.add.graphics().setDepth(12));
    if (world.pole) {
      this.goalG.fillStyle(0xB9C4C6, 1).fillRect(world.pole.x + 4, world.pole.y, 4, world.pole.h);
      this.buoy = add(s.add.image(world.pole.x + 6, world.pole.y - 4, 'buoy').setDepth(12));
    }
    if (this.lv.goal.type === 'pearl') {
      const g = this.lv.goal;
      this.goalG.fillStyle(0x5B4A7A, 1).fillPoints([...quad(g.x - 34, 400, g.x - 30, 380, g.x, 384, 8), ...quad(g.x, 384, g.x + 30, 380, g.x + 34, 400, 8)], true);
      this.bigPearl = add(s.add.image(g.x, g.y, 'pearl-big').setDepth(13));
    }
    this.pearlImgs = world.pearls.map((p) => add(s.add.image(p.x, p.y, 'pearl').setDepth(13)));
    this.glowG = add(s.add.image(0, 0, 'glow').setDepth(13.5).setVisible(false));
    this.prompt = add(s.add.container(0, 0).setDepth(14.5).setVisible(false));
    const pg = s.add.graphics().fillStyle(0x0C2A30, 0.72).fillRoundedRect(-13, -13, 26, 24, 9);
    this.prompt.add([pg, s.add.text(0, -1, touch ? '◎' : 'X', { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#FDF7EA' }).setOrigin(0.5)]);

    // Jefe
    if (world.boss) {
      this.bossImg = add(s.add.image(BOSS_ORIGIN.x, BOSS_ORIGIN.y, 'boss').setOrigin(0).setDepth(16));
      this.bossG = add(s.add.graphics().setDepth(16.1));
      this.claw = add(s.add.image(0, 0, 'claw-open').setOrigin(...ORIGIN.claw).setDepth(16.2).setVisible(false));
      this.rainImgs = [];
    }

    this.ghost = this.makeCrab(17);
    this.ghostShell = add(s.add.image(0, 0, 'shell-infancia').setOrigin(...ORIGIN.shell).setDepth(17).setVisible(false));
    this.mentor = world.mentor ? this.makeCrab(17) : null;
    this.extraCrabs = [];
    this.player = this.makeCrab(18);
    this.fx = add(s.add.graphics().setDepth(19));
    this.sprayImgs = [];
    this.floatTxt = add(s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#FFFDF2', stroke: '#14323A', strokeThickness: 4 }).setOrigin(0, 0.5).setDepth(20).setVisible(false));

    // Capas de pantalla (no se mueven con la cámara)
    this.nightRect = add(s.add.rectangle(0, 0, W, H, 0x06081A, 0.36).setOrigin(0).setScrollFactor(0).setDepth(30).setVisible(!!this.lv.night));
    this.beams = (this.lv.lights || []).map((L) => add(s.add.image(L.x, -60, 'beam').setOrigin(0.5, 0).setDepth(30.5).setBlendMode(Phaser.BlendModes.ADD)));
    if (this.lv.dark) {
      this.darkImg = add(s.add.image(0, 0, 'dark').setScrollFactor(0).setDepth(31));
      this.darkG = add(s.add.graphics().setScrollFactor(0).setDepth(31));
      this.glowPool = [];
    }
    this.w3Claw = add(s.add.image(0, 0, 'claw-arm-open').setOrigin(...ORIGIN.claw).setScrollFactor(0).setDepth(32).setVisible(false));
    this.w3Shell = add(s.add.image(0, 0, 'shell-espiral').setOrigin(...ORIGIN.shell).setScrollFactor(0).setDepth(32).setVisible(false));
    this.overlayG = add(s.add.graphics().setScrollFactor(0).setDepth(33));

    // HUD
    this.hud = add(s.add.graphics().setScrollFactor(0).setDepth(40));
    this.hud.fillStyle(0x0C2A30, 0.55).fillRoundedRect(14, 12, 186, 44, 22);
    add(s.add.image(40, 34, 'pearl').setScale(9 / 7).setScrollFactor(0).setDepth(40));
    this.hudCount = add(s.add.text(56, 35, '', { fontFamily: FONT, fontSize: '20px', fontStyle: '600', color: '#FDF7EA' }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(40));
    this.hudShell = add(s.add.image(172, 45, 'shell-infancia').setOrigin(...ORIGIN.shell).setScale(0.62).setScrollFactor(0).setDepth(40));
    this.hudEmpty = add(s.add.graphics().setScrollFactor(0).setDepth(40));
    this.hudEmpty.lineStyle(2, 0xFDF7EA, 0.7);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) this.hudEmpty.beginPath().arc(172, 34, 13, a, a + Math.PI / 12).strokePath();
    this.bossHud = add(s.add.graphics().setScrollFactor(0).setDepth(40));
    this.card = add(s.add.container(W / 2, 0).setScrollFactor(0).setDepth(41).setAlpha(0));
    const style = (size, weight) => ({ fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight, color: '#FDF7EA', stroke: '#0C2A30', strokeThickness: 6 });
    this.card.add([
      s.add.text(0, 130, `MUNDO ${this.lv.n}`, style(18, '600')).setOrigin(0.5).setAlpha(0.9),
      s.add.text(0, 175, this.lv.name, style(52, 'bold')).setOrigin(0.5),
    ]);
    this.fadeRect = add(s.add.rectangle(0, 0, W, H, 0x0A1E24, 0).setOrigin(0).setScrollFactor(0).setDepth(45));
    this.hudObjs = this.objs.filter((o) => o.depth >= 40 && o.depth < 45);
    if (!hud) this.hudObjs.forEach((o) => o.setVisible(false));
  }

  /* ---------- Cangrejos (Pinza, mentora, fantasma, cangrejitos del final) ---------- */
  makeCrab(depth) {
    const s = this.scene;
    const c = this.add(s.add.container(0, 0).setDepth(depth).setVisible(false));
    c.shellImg = s.add.image(-4, -9, 'shell-infancia').setOrigin(...ORIGIN.shell);
    c.body = s.add.image(0, 0, 'crab-red-0').setOrigin(...ORIGIN.crab);
    c.peek = s.add.image(12.5, -4, 'peek').setVisible(false);
    c.add([c.shellImg, c.body, c.peek]);
    return c;
  }

  setCrab(c, { x, feetY, facing = 1, shell = null, walk = 0, spin = 0, rot = 0, old = false, tremble = false, hide = false, alpha = 1, scale = 1 }) {
    const T = this.w.T;
    c.setVisible(true).setAlpha(alpha);
    c.setPosition(x + (tremble && !hide ? Math.sin(T * 46) * 0.9 : 0), feetY);
    c.setScale(scale * facing, scale);
    c.setRotation(rot);
    if (hide && shell) {
      c.body.setVisible(false);
      c.peek.setVisible(true);
      c.shellImg.setVisible(true).setTexture(`shell-${shell}`).setPosition(0, 0).setScale(1.12).setRotation(0);
      return;
    }
    c.peek.setVisible(false);
    const variant = old ? 'old' : shell ? 'red' : 'naked';
    const frame = ((Math.floor((walk * 0.15) / (Math.PI * 2) * CRAB_FRAMES) % CRAB_FRAMES) + CRAB_FRAMES) % CRAB_FRAMES;
    c.body.setVisible(true).setTexture(`crab-${variant}-${frame}`);
    c.shellImg.setVisible(!!shell).setPosition(-4, -9).setScale(1).setRotation(spin * Math.PI * 2);
    if (shell) c.shellImg.setTexture(`shell-${shell}`);
  }

  /* ---------- Fondo ---------- */
  buildBackground() {
    const s = this.scene, lv = this.lv, pal = lv.pal, add = this.add;
    if (lv.bg === 'deep') {
      add(s.add.image(0, 0, gradTexture(s, 'bg-deep', [[0, '#1C5A77'], [0.55, '#0E3149'], [1, '#061826']], H)).setOrigin(0).setDisplaySize(W, H).setScrollFactor(0).setDepth(0));
      this.bgG = add(s.add.graphics().setScrollFactor(0).setDepth(1));
      return;
    }
    this.skyA = add(s.add.image(0, 0, gradTexture(s, `sky-${lv.n}-a`, [[0, pal.skyA[0]], [1, pal.skyB[0]]], 300)).setOrigin(0).setDisplaySize(W, 300).setScrollFactor(0).setDepth(0));
    this.skyB = add(s.add.image(0, 0, gradTexture(s, `sky-${lv.n}-b`, [[0, pal.skyA[1]], [1, pal.skyB[1]]], 300)).setOrigin(0).setDisplaySize(W, 300).setScrollFactor(0).setDepth(0));
    if (lv.bg === 'night') this.dawn = add(s.add.image(0, 0, gradTexture(s, 'sky-dawn', [[0, 'rgba(120,150,210,.8)'], [1, 'rgba(255,190,140,.9)']], 300)).setOrigin(0).setDisplaySize(W, 300).setScrollFactor(0).setDepth(0.5).setAlpha(0));
    this.skyG = add(s.add.graphics().setScrollFactor(0).setDepth(1));
    this.sunGlow = add(s.add.image(0, 0, 'glow').setScrollFactor(0).setDepth(1).setTint(0xFFF0C8));
    const cloudKey = lv.bg === 'night' ? 'cloud-night' : lv.bg === 'dusk' ? 'cloud-dusk' : 'cloud';
    const cloudAlpha = lv.bg === 'night' ? 0.25 : lv.bg === 'dusk' ? 0.35 : 0.75;
    this.clouds = [0, 1, 2, 3, 4].map(() => add(s.add.image(0, 0, cloudKey).setOrigin(60 / 140, 30 / 50).setScrollFactor(0).setDepth(2).setAlpha(cloudAlpha)));
    if (lv.mount) {
      const key = lv.bg === 'dusk' || lv.bg === 'night' ? 'mount-night' : lv.bg === 'rocks' ? 'mount-rocks' : 'mount-beach';
      this.mountClaw = add(s.add.image(0, 0, 'mount-claw').setOrigin(40 / 120, 230 / 240).setScrollFactor(0).setDepth(2.9).setVisible(false));
      this.mount = add(s.add.image(0, 0, key).setOrigin(280 / 560, 220 / 240).setScrollFactor(0).setDepth(3));
      this.mountEyes = add(s.add.graphics().setScrollFactor(0).setDepth(3.1));
    }
    this.seaA = add(s.add.image(0, 296, gradTexture(s, `sea-${lv.n}-a`, [[0, pal.sea[0]], [1, '#2C5E7E']], 260)).setOrigin(0).setDisplaySize(W, 260).setScrollFactor(0).setDepth(4));
    this.seaB = add(s.add.image(0, 296, gradTexture(s, `sea-${lv.n}-b`, [[0, pal.sea[1]], [1, '#2C5E7E']], 260)).setOrigin(0).setDisplaySize(W, 260).setScrollFactor(0).setDepth(4));
    this.seaG = add(s.add.graphics().setScrollFactor(0).setDepth(4.1));
  }

  // Agua de los fosos: color plano con una sombra en degradado encima.
  buildWater() {
    const s = this.scene, lv = this.lv;
    if (!lv.water) return;
    const dark = lv.bg === 'dusk' || lv.bg === 'night';
    this.waterTop = dark ? 0x4A5B88 : 0x4FB0C3;
    this.waterG = this.add(s.add.graphics().setScrollFactor(0).setDepth(6));
    this.waterShade = this.add(s.add.image(0, 0, gradTexture(s, dark ? 'water-dark' : 'water', [[0, 'rgba(0,0,0,0)'], [1, dark ? '#232D4E' : '#23708A']], 80)).setOrigin(0).setScrollFactor(0).setDepth(6.1));
  }

  drawBackground(prog) {
    const w = this.w, lv = this.lv, T = w.T, camX = w.camX;
    if (lv.bg === 'deep') {
      const g = this.bgG.clear();
      g.fillStyle(0xBFF3FF, 0.12);
      for (let i = 0; i < 5; i++) {
        const x = ((i * 240 - camX * 0.15 + Math.sin(T * 0.3 + i) * 30) % 1200 + 1200) % 1200 - 120;
        g.fillPoints([{ x, y: 0 }, { x: x + 60, y: 0 }, { x: x + 220, y: H }, { x: x + 120, y: H }], true);
      }
      g.lineStyle(9, 0x144646, 0.75);
      for (let i = 0; i < 9; i++) {
        const x = ((i * 150 - camX * 0.45) % 1350 + 1350) % 1350 - 100, pts = [];
        for (let y = H; y > 220 + (i % 3) * 40; y -= 20) pts.push({ x: x + Math.sin(y * 0.03 + T * 1.2 + i) * 10, y });
        g.strokePoints(pts);
      }
      g.fillStyle(0xC8F5FF, 0.35);
      for (let i = 0; i < 40; i++) { const x = ((i * 97 - camX * 0.6) % W + W) % W, y = (i * 53 + T * (8 + (i % 5))) % H; g.fillCircle(x, H - y, 1.2); }
      return;
    }
    const night = lv.bg === 'night' ? 1 : lv.bg === 'dusk' && w.ending ? w.ending.tide : 0;
    const dawn = lv.bg === 'night' && w.ending ? w.ending.tide : 0;
    this.skyB.setAlpha(prog);
    if (this.dawn) this.dawn.setAlpha(dawn);
    const g = this.skyG.clear();
    let sunX, sunY, moon = false;
    if (lv.bg === 'dusk' || lv.bg === 'night') {
      for (let i = 0; i < 26; i++) {
        g.fillStyle(0xFFFFF0, 0.25 + 0.5 * Math.abs(Math.sin(T + i)) * (0.4 + night));
        g.fillCircle((i * 137) % W, (i * 71) % 200, 1.2);
      }
      moon = true;
      sunY = lv.bg === 'night' ? 70 + dawn * 140 : lerp(250, 90, night);
      sunX = lv.bg === 'night' ? 300 : 760;
    } else {
      sunX = 190 - camX * 0.02; sunY = 110 + prog * 30 + (lv.bg === 'rocks' ? 40 : 0);
    }
    const r = moon ? 80 : 90;
    this.sunGlow.setPosition(sunX, sunY).setDisplaySize(r * 2, r * 2).setAlpha(moon ? 0.6 : 0.95).setTint(moon ? 0xFFF8E2 : 0xFFF0C8);
    g.fillStyle(moon ? 0xFFF6E0 : 0xFFF4D6, 1).fillCircle(sunX, sunY, moon ? 24 : 34);
    this.clouds.forEach((c, i) => c.setPosition(((i * 260 - camX * 0.08 + T * 4) % 1300 + 1300) % 1300 - 160, 60 + (i % 3) * 34));

    if (this.mount) {
      const mt = lv.mount, e = w.ending;
      const grow = lv.ending === 'w1' && e ? e.tide : 0;
      const claw = lv.ending === 'w1' && e ? e.claw : 0;
      const eyes = lv.bg === 'dusk' ? 0.35 : lv.bg === 'night' ? 1 - (e ? e.tide : 0) : claw;
      const mx = mt.x - camX * 0.03, sc = mt.base + prog * mt.span + grow * 0.5;
      this.mount.setPosition(mx, 300).setScale(sc);
      this.mountClaw.setVisible(claw > 0).setPosition(mx + 120 * sc, 300 + (10 - claw * 120) * sc).setScale(sc);
      const eg = this.mountEyes.clear();
      if (eyes > 0) {
        eg.fillStyle(0xFFD678, eyes);
        eg.fillEllipse(mx - 28 * sc, 300 - 130 * sc, 14 * sc, 8 * sc);
        eg.fillEllipse(mx + 18 * sc, 300 - 134 * sc, 14 * sc, 8 * sc);
      }
    }

    const sg = this.seaG.clear();
    const tide = lv.ending === 'w1' && w.ending ? w.ending.tide : 0;
    const pal = lv.pal;
    this.seaA.setY(296 + tide * 20);
    this.seaB.setY(296 + tide * 20).setAlpha(prog);
    sg.lineStyle(2, 0xFFFFFF, 0.3);
    for (let rI = 0; rI < 3; rI++) {
      const pts = [];
      for (let x = 0; x <= W; x += 16) pts.push({ x, y: 308 + rI * 18 + tide * 20 + Math.sin(x * 0.03 + T * (1 + rI * 0.3) + camX * 0.002 * (rI + 1)) * 2 });
      sg.strokePoints(pts);
    }
    const dune = [{ x: 0, y: 540 }];
    for (let x = 0; x <= W + 20; x += 20) {
      const wx = x + camX * 0.4, rough = lv.bg === 'rocks' ? Math.abs(Math.sin(wx * 0.013)) * 24 : 0;
      dune.push({ x, y: 392 + Math.sin(wx * 0.008) * 16 + Math.sin(wx * 0.019) * 6 - rough });
    }
    dune.push({ x: W, y: 540 });
    sg.fillStyle(hex(pal.dune), 1).fillPoints(dune, true);
  }

  drawWater() {
    const w = this.w, lv = this.lv;
    if (!lv.water) return;
    const g = this.waterG.clear();
    const wy = lv.ending === 'w2' && w.ending ? lv.water : w.waterY;
    const pts = [{ x: 0, y: 540 }];
    const top = [];
    for (let x = 0; x <= W + 16; x += 16) { const p = { x, y: wy + Math.sin((x + w.camX) * 0.02 + w.T * 1.8) * 4 }; pts.push(p); top.push(p); }
    pts.push({ x: W, y: 540 });
    g.fillStyle(this.waterTop, 1).fillPoints(pts, true);
    this.waterShade.setPosition(0, wy + 4).setDisplaySize(W, Math.max(1, H - wy - 4));
    g.lineStyle(2.5, 0xEAF8F6, 0.75).strokePoints(top);
  }

  /* ---------- Terreno (se dibuja una vez) ---------- */
  buildTerrain() {
    const s = this.scene, lv = this.lv, pal = lv.pal;
    const g = this.add(s.add.graphics().setDepth(10));
    for (const b of lv.solids) {
      if (b.k === 'sand') {
        const bands = 8, bh = Math.min(140, b.h) / bands;
        g.fillStyle(hex(pal.gBot), 1).fillRoundedRect(b.x, b.y, b.w, b.h, { tl: 16, tr: 16, bl: 0, br: 0 });
        for (let i = bands - 1; i >= 0; i--) {
          g.fillStyle(mix(pal.gTop, pal.gBot, i / bands), 1);
          if (i === 0) g.fillRoundedRect(b.x, b.y, b.w, bh + 16, { tl: 16, tr: 16, bl: 0, br: 0 });
          else g.fillRect(b.x, b.y + bh * i, b.w, bh + 1);
        }
        g.lineStyle(4, hex(pal.lip), 1).lineBetween(b.x + 6, b.y + 2, b.x + b.w - 6, b.y + 2);
        const dot = pal.dot.match(/[\d.]+/g).map(Number);
        g.fillStyle((dot[0] << 16) | (dot[1] << 8) | dot[2], dot[3]);
        const n = Math.floor(b.w / 26);
        for (let i = 0; i < n; i++) {
          g.fillCircle(b.x + 8 + ((i * 53) % (b.w - 16)), b.y + 22 + ((i * 37) % Math.max(20, Math.min(130, b.h - 30))), 1.7);
        }
      } else if (b.k === 'stone') {
        g.fillStyle(hex(pal.stone), 1).fillRoundedRect(b.x, b.y, b.w, b.h + 8, 18);
        g.fillStyle(0xFFFFFF, 0.28).fillEllipse(b.x + b.w * 0.38, b.y + 12, b.w * 0.44, 10);
      } else if (b.k === 'rock') {
        this.drawRock(g, b);
      }
    }
    if (lv.n === 1) {
      g.fillStyle(0x18303A, 0.28).fillRect(2700, 294, 200, 28); // sombra del túnel
      g.fillStyle(0x5CB6C5, 1).fillEllipse(3240, 330, 168, 16); // la poza del valle
      g.lineStyle(2.2, 0xE4799A, 1);
      for (const ax of [3178, 3300]) for (let k = -2; k <= 2; k++) g.strokePoints(quad(ax, 323, ax + k * 4, 312, ax + k * 5, 306, 6));
    }
  }

  drawRock(g, b) {
    const top = Math.max(b.y, -20), bottom = Math.min(b.y + b.h, 560);
    g.fillStyle(hex(this.lv.pal.rock), 1).fillRoundedRect(b.x, top - 30, b.w, bottom - top + 30, 16);
    g.lineStyle(3, 0xFFFFFF, 0.1);
    for (let i = 0; i < 6; i++) {
      const yy = top + 30 + i * 46;
      if (yy > bottom - 10) break;
      g.strokePoints(quad(b.x + 20, yy, b.x + b.w / 2, yy + 10, b.x + b.w - 20, yy, 8));
    }
  }

  // Plataformas que cambian: madera a la deriva, conchas rotas, la reja de la arena del jefe y las corrientes.
  drawDynamic() {
    const w = this.w, g = this.dyn.clear(), T = w.T;
    for (const z of w.zones) {
      if (z.x + z.w < w.camX || z.x > w.camX + W) continue;
      if (z.fy) {
        g.lineStyle(1.6, 0xDCFAFF, 0.75);
        for (let i = 0; i < 18; i++) {
          const by = z.y + z.h - ((T * 140 + i * 41) % z.h), bx = z.x + z.w / 2 + Math.sin(T * 3 + i) * z.w * 0.32;
          g.strokeCircle(bx, by, 2 + (i % 4));
        }
      } else {
        g.lineStyle(2, 0xBEF0FF, 0.18);
        const d = Math.sign(z.fx);
        for (let i = 0; i < 16; i++) {
          const x = z.x + (((T * Math.abs(z.fx) * d + i * 89) % z.w) + z.w) % z.w, y = 60 + (i * 47) % 380;
          g.strokePoints(quad(x, y, x + d * 20, y - 4, x + d * 40, y, 6));
        }
      }
    }
    for (const s of w.solids) {
      if (s.x + s.w < w.camX - 20 || s.x > w.camX + W + 20) continue;
      if (s.k === 'drift') {
        g.fillStyle(0x9C7A55, 1).fillRoundedRect(s.x, s.y, s.w, s.h, 9);
        g.lineStyle(1.6, 0x7A5B3C, 1).strokePoints(quad(s.x + 10, s.y + 7, s.x + s.w / 2, s.y + 11, s.x + s.w - 12, s.y + 6, 8));
        g.fillStyle(0xFFF0D2, 0.35).fillRect(s.x + 8, s.y + 2, s.w - 16, 2);
      } else if (s.k === 'crumble') {
        if (s.gone) { g.lineStyle(1.5, 0xFFFFFF, 0.18).strokeRoundedRect(s.x, s.y, s.w, s.h, 8); continue; }
        const jx = s.t > 0 ? Math.sin(T * 60) * 1.5 : 0;
        const pts = [{ x: s.x + jx, y: s.y + s.h }, ...quad(s.x + jx, s.y + s.h, s.x + jx, s.y, s.x + s.w * 0.5 + jx, s.y - 3, 6), ...quad(s.x + s.w * 0.5 + jx, s.y - 3, s.x + s.w + jx, s.y, s.x + s.w + jx, s.y + s.h, 6)];
        g.fillStyle(0xEADCD3, 1).fillPoints(pts, true);
        g.lineStyle(2, 0xB79C8E, 1).strokePoints(pts, true);
        g.lineBetween(s.x + s.w * 0.3 + jx, s.y + 2, s.x + s.w * 0.4 + jx, s.y + 9);
        g.lineBetween(s.x + s.w * 0.4 + jx, s.y + 9, s.x + s.w * 0.33 + jx, s.y + s.h);
        g.lineBetween(s.x + s.w * 0.7 + jx, s.y + 1, s.x + s.w * 0.62 + jx, s.y + s.h - 4);
      } else if (s.gate && !s.gone) this.drawRock(g, s);
    }
  }

  /* ---------- Efectos ---------- */
  handleEvent(e) {
    const r = Math.random;
    if (e.type === 'burst') {
      const col = hex(e.col);
      for (let i = 0; i < e.n; i++) {
        const a = r() * Math.PI * 2, v = (0.3 + r()) * e.sp;
        this.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + r() * 0.3, max: 0.8, col, r: 2 + r() * 2 });
      }
    } else if (e.type === 'ring') this.parts.push({ x: e.x, y: e.y, vx: e.vx, vy: -20, life: 0.7, max: 0.7, col: 0xFFFFFF, r: 2.5, ring: true });
    else if (e.type === 'bubble') this.parts.push({ x: e.x, y: H, vx: 0, vy: -120 - r() * 80, life: 2, max: 2, col: 0xFFFFFF, r: 2 + r() * 4, ring: true });
    else if (e.type === 'spray') this.parts.push({ x: e.x, y: e.y, vx: e.vx, vy: e.vy, life: 1.4, max: 1.4, shell: e.shell });
    else if (e.type === 'shake' || (e.type === 'sfx' && e.name === 'bossHit')) { /* la sacudida la lleva el core en world.shake */ }
  }

  tickFx(dt) {
    for (const p of this.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.ring ? -20 : 380) * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  /* ---------- Cada cuadro ---------- */
  render() {
    const w = this.w, lv = this.lv, T = w.T, P = w.P, s = this.scene;
    const cam = s.cameras.main;
    const prog = clamp(w.camX / (lv.world - W), 0, 1);
    let sx = 0, sy = 0;
    if (w.shake > 0 && !this.reduce) { sx = (Math.random() - 0.5) * 10 * w.shake; sy = (Math.random() - 0.5) * 10 * w.shake; }
    cam.setScroll(w.camX + sx, sy);

    this.drawBackground(prog);
    this.drawWater();
    this.drawDynamic();

    this.stars.forEach((img, i) => img.setTexture(i <= w.cpIndex ? 'star-on' : 'star-off').setRotation(Math.sin(T * 1.5 + lv.cps[i].x) * 0.08));
    if (this.buoy) this.buoy.setRotation(Math.sin(T * 1.6) * 0.05);
    if (this.bigPearl) this.bigPearl.setVisible(!(w.ending && w.ending.taken)).setY(lv.goal.y + Math.sin(T * 2) * 2);
    w.pearls.forEach((p, i) => this.pearlImgs[i].setVisible(!p.taken).setY(p.y + Math.sin(T * 3 + p.x * 0.05) * 2));

    this.renderShells();
    this.renderEnemies();
    if (w.boss) this.renderBoss();

    // Indicador de concha cercana
    const near = w.state === 'play' ? w.nearestShell() : null;
    this.prompt.setVisible(!!near);
    if (near) this.prompt.setPosition(near.x + 15, near.y - 16 + Math.sin(T * 5) * 2);

    // Pista fantasma
    if (lv.hint && w.hintVisible) this.renderGhost(lv.hint, (w.hintT - 5) % 3.6);
    else { this.ghost.setVisible(false); this.ghostShell.setVisible(false); }

    if (this.mentor) this.setCrab(this.mentor, { x: w.mentor.x, feetY: w.mentor.y, facing: w.mentor.facing, walk: w.mentor.walk, old: true, scale: 1.08 });
    this.renderEndingCrabs();

    const showP = w.state !== 'intro' || w.stT >= 0.5;
    if (showP) {
      const blink = P.inv > 0 && w.state === 'play' && Math.floor(T * 18) % 2 === 0;
      const rot = w.state === 'dying' ? Math.PI : P.tumble ? P.tumble * Math.PI * 3 : 0;
      const hard = lv.ending === 'w3' && w.ending && w.ending.taken;
      this.setCrab(this.player, {
        x: P.x + P.w / 2 + (hard ? Math.sin(T * 70) * 1.5 : 0),
        feetY: P.y + P.h + (w.state === 'dying' ? -20 : 0),
        facing: P.facing, shell: P.shell, walk: P.walk, spin: P.spin, rot, tremble: !P.shell,
        hide: !!lv.lights && P.hidden && w.state === 'play', alpha: blink ? 0.45 : 1,
      });
    } else this.player.setVisible(false);

    this.renderParticles();
    this.renderOverlays();
    this.renderHud();
  }

  renderShells() {
    const w = this.w, T = w.T, seen = new Set();
    for (const sh of w.shells) {
      seen.add(sh);
      let img = this.shellImgs.get(sh);
      if (!img) {
        img = this.scene.add.image(0, 0, `shell-${sh.type}`).setOrigin(...ORIGIN.shell).setDepth(14);
        this.shellImgs.set(sh, img);
      }
      img.setTexture(`shell-${sh.type}`).setPosition(sh.x + 15, sh.y + 30 + (sh.fresh ? Math.sin(T * 3) * 1.5 - 1.5 : 0));
      img.setRotation(sh.thrown ? T * 14 : 0);
    }
    for (const [sh, img] of this.shellImgs) if (!seen.has(sh)) { img.destroy(); this.shellImgs.delete(sh); }
    const fresh = w.shells.find((sh) => sh.fresh && Math.abs(sh.x - w.camX - W / 2) < W);
    if (fresh) {
      const k = 0.6 + Math.sin(T * 3) * 0.3;
      this.glowG.setVisible(true).setPosition(fresh.x + 15, fresh.y + 16).setDisplaySize(60, 60).setTint(0xFFFFF0).setAlpha(0.55 * k);
    } else this.glowG.setVisible(false);
  }

  renderEnemies() {
    const w = this.w, T = w.T, seen = new Set();
    if (!this.deadG) this.deadG = this.add(this.scene.add.graphics().setDepth(15));
    const dg = this.deadG.clear();
    for (const e of w.enemies) {
      seen.add(e);
      let img = this.enemyImgs.get(e);
      if (!img) { img = this.scene.add.image(0, 0, 'flea').setDepth(15); this.enemyImgs.set(e, img); }
      if (!e.alive) {
        img.setVisible(false);
        if (e.deadT < 0.5) dg.fillStyle(e.t === 'gull' ? 0xF3F6F6 : 0xC9A56E, 1 - e.deadT / 0.5).fillEllipse(e.x + e.w / 2, e.y + e.h - 3.5, 33.6, 7);
        continue;
      }
      img.setVisible(true);
      if (e.t === 'flea') {
        const hop = Math.abs(Math.sin(T * 9 + e.ph)) * 6;
        img.setTexture('flea').setOrigin(0.5, 36 / 48).setPosition(e.x + e.w / 2, e.y + e.h - hop).setFlipX(e.dir < 0);
      } else if (e.t === 'gull') {
        const flap = Math.sin(T * 10 + e.ph);
        img.setTexture(`gull-${flap < -0.3 ? 0 : flap < 0.5 ? 1 : 2}`).setOrigin(0.5).setPosition(e.x + e.w / 2, e.y + e.h / 2).setFlipX(e.dir < 0);
      } else if (e.t === 'jelly') {
        img.setTexture(`jelly-${Math.sin(T * 4 + e.ph) > 0 ? 1 : 0}`).setOrigin(0.5, 16 / 56).setPosition(e.x + e.w / 2, e.y + 12);
      } else {
        img.setTexture(`urchin-${Math.floor(T * 3 + e.ph) % 2}`).setOrigin(0.5, 28 / 40).setPosition(e.x + e.w / 2, e.y + e.h - 9);
      }
    }
    for (const [e, img] of this.enemyImgs) if (!seen.has(e)) { img.destroy(); this.enemyImgs.delete(e); }
  }

  renderBoss() {
    const w = this.w, b = w.boss, eye = this.lv.boss.eye, T = w.T, P = w.P;
    const ox = b.flinch > 0 ? Math.sin(T * 50) * 4 : 0, oy = b.sink * 380;
    const visible = w.camX + W >= 4080;
    this.bossImg.setVisible(visible).setPosition(BOSS_ORIGIN.x + ox, BOSS_ORIGIN.y + oy);
    const g = this.bossG.clear();
    if (visible) {
      const ex = eye.x + ox, ey = eye.y + oy, open = b.eye;
      g.fillStyle(0x2B2140, 1).fillEllipse(ex, ey, 60, 44);
      if (open > 0.05) {
        g.fillStyle(0xFFE28C, 0.25 * open).fillCircle(ex, ey, 46);
        g.fillStyle(0xFFE59A, 1).fillEllipse(ex, ey, 48, 34 * open);
        const lx = clamp((P.x + 15 - eye.x) * 0.02, -9, 3), ly = clamp((P.y - eye.y) * 0.02, -4, 5) * open;
        g.fillStyle(0x2B2140, 1).fillEllipse(ex + lx, ey + ly, 12, 22 * open);
      } else {
        g.lineStyle(3, 0xFFD678, 0.55).strokePoints(quad(ex - 20, ey + 2, ex, ey + 8, ex + 20, ey + 2, 8));
      }
    }
    if (b.claw) {
      const tele = !b.claw.go;
      this.claw.setVisible(true).setTexture(tele ? 'claw-closed' : 'claw-open').setPosition(b.claw.x, tele ? 392 + Math.sin(T * 40) * 3 : 418);
    } else this.claw.setVisible(false);
    while (this.rainImgs.length < b.rain.length) this.rainImgs.push(this.add(this.scene.add.image(0, 0, 'shell-espiral').setOrigin(...ORIGIN.shell).setDepth(16.3)));
    this.rainImgs.forEach((img, i) => {
      const r = b.rain[i];
      if (!r) { img.setVisible(false); return; }
      const k = clamp(1 - r.warn / 0.9, 0, 1);
      g.fillStyle(0x28143C, 0.15 + 0.3 * k).fillEllipse(r.x, 440, (8 + 14 * k) * 2, 8);
      img.setVisible(r.warn <= 0).setTexture(`shell-${r.type}`).setPosition(r.x, r.y + 30);
    });
  }

  // Un cangrejo fantasma repite el movimiento que el jugador no está encontrando (redundancia sin texto, punto 44).
  renderGhost(hn, t) {
    const wall = hn.wall, sh = hn.ground - 30;
    const K = [[0, wall - 150, hn.ground], [0.7, wall - 75, hn.ground], [1.0, wall - 46, sh - 34], [1.2, wall - 21, sh], [1.55, wall - 21, sh], [1.95, wall - 18, sh - 92]];
    if (hn.dj) K.push([2.35, wall - 16, hn.top - 14]);
    const last = K[K.length - 1][0];
    K.push([last + 0.4, wall + 34, hn.top], [3.6, wall + 34, hn.top]);
    let x = K[0][1], y = K[0][2], spin = 0;
    for (let i = 1; i < K.length; i++) {
      if (t <= K[i][0]) {
        const a = K[i - 1], b = K[i], k = Phaser.Math.Easing.Sine.InOut((t - a[0]) / (b[0] - a[0]));
        x = lerp(a[1], b[1], k); y = lerp(a[2], b[2], k);
        if (hn.dj && i === 6) spin = k;
        break;
      }
      x = K[i][1]; y = K[i][2];
    }
    const alpha = 0.5 * clamp(Math.min(t / 0.3, (3.6 - t) / 0.4), 0, 1);
    this.ghostShell.setVisible(true).setTexture(`shell-${hn.shell}`).setPosition(wall - 21, hn.ground).setAlpha(alpha);
    this.setCrab(this.ghost, { x, feetY: y, shell: hn.wear, walk: t * 220, spin, alpha });
  }

  renderEndingCrabs() {
    const w = this.w, e = w.ending, list = [];
    if (e && this.lv.ending === 'w1' && e.baby && w.endT > 3.4 && w.endT < 9) {
      list.push({ x: e.baby.x + 15, feetY: e.baby.y - (e.baby.hop || 0), scale: 0.62, facing: e.baby.facing, shell: e.baby.worn ? 'infancia' : null, walk: e.baby.x * 6 });
    }
    if (e && this.lv.ending === 'w6' && e.crabs) {
      for (const c of e.crabs) list.push({ x: c.x, feetY: 440, scale: 0.75, shell: c.worn, walk: c.x * 5, tremble: !c.worn });
      list.push({ x: e.baby.x, feetY: 440, scale: 0.62, shell: 'infancia', walk: e.baby.x * 6 });
    }
    while (this.extraCrabs.length < list.length) this.extraCrabs.push(this.makeCrab(17));
    this.extraCrabs.forEach((c, i) => (list[i] ? this.setCrab(c, list[i]) : c.setVisible(false)));
    if (e && this.lv.ending === 'w6' && e.propia && !e.worn) {
      if (!this.propia) this.propia = this.add(this.scene.add.image(0, 0, 'shell-propia').setOrigin(...ORIGIN.shell).setDepth(17));
      this.propia.setVisible(true).setPosition(e.propia.x, e.propia.y + Math.sin(w.T * 3) * 2);
      this.glowG.setVisible(true).setPosition(e.propia.x, e.propia.y - 14).setDisplaySize(64, 64).setTint(0xFFF0C8).setAlpha(0.6);
    } else if (this.propia) this.propia.setVisible(false);
  }

  renderParticles() {
    const g = this.fx.clear();
    let k = 0;
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.shell) {
        if (!this.sprayImgs[k]) this.sprayImgs[k] = this.add(this.scene.add.image(0, 0, 'shell-espiral').setOrigin(...ORIGIN.shell).setDepth(19));
        this.sprayImgs[k++].setVisible(true).setTexture(`shell-${p.shell}`).setPosition(p.x, p.y).setRotation(p.life * 6).setScale(0.65).setAlpha(a);
      } else if (p.ring) g.lineStyle(1.5, p.col, 0.8 * a).strokeCircle(p.x, p.y, p.r);
      else g.fillStyle(p.col, a).fillCircle(p.x, p.y, p.r);
    }
    for (; k < this.sprayImgs.length; k++) this.sprayImgs[k].setVisible(false);
    const ft = this.w.floatTxt;
    if (ft && ft.t < 2.2) {
      const y = ft.y - ft.t * 30;
      this.floatTxt.setVisible(true).setText(ft.txt).setPosition(ft.x + 14, y).setAlpha(clamp(2.2 - ft.t, 0, 1));
      g.fillStyle(0xF6EFE2, clamp(2.2 - ft.t, 0, 1)).fillCircle(ft.x + 4, y, 7);
    } else this.floatTxt.setVisible(false);
  }

  renderOverlays() {
    const w = this.w, lv = this.lv, P = w.P, e = w.ending, T = w.T;
    // Noche (Mundo 5): la mirada del Acaparador barre la playa
    if (lv.night) {
      const fadeOut = 1 - (e ? e.tide : 0);
      this.nightRect.setAlpha(0.36 * fadeOut);
      this.beams.forEach((img, i) => img.setVisible(fadeOut > 0.02).setRotation(-w.lightAngle(lv.lights[i])).setAlpha(fadeOut));
    }
    // Profundidades (Mundo 3): solo se ve cerca de Pinza
    if (lv.dark) {
      const px = P.x + P.w / 2 - w.camX, py = P.y + P.h / 2, sc = w.lightR / 250, half = 512 * sc;
      this.darkImg.setPosition(px, py).setScale(sc);
      const g = this.darkG.clear().fillStyle(0x020A16, 0.95);
      g.fillRect(0, 0, W, Math.max(0, py - half));
      g.fillRect(0, py + half, W, Math.max(0, H - py - half));
      g.fillRect(0, py - half, Math.max(0, px - half), half * 2);
      g.fillRect(px + half, py - half, Math.max(0, W - px - half), half * 2);
      const glows = [];
      for (const en of w.enemies) if (en.alive && en.t === 'jelly') glows.push([en.x + en.w / 2 - w.camX, en.y + 10, 68, 0xFF78C8, 0.55]);
      for (const p of w.pearls) if (!p.taken) glows.push([p.x - w.camX, p.y, 20, 0xC8FFFA, 0.22]);
      if (lv.goal.type === 'pearl' && !(e && e.taken)) glows.push([lv.goal.x - w.camX, lv.goal.y, 140, 0xFFFADC, 0.6]);
      while (this.glowPool.length < glows.length) this.glowPool.push(this.add(this.scene.add.image(0, 0, 'glow').setScrollFactor(0).setDepth(31.5).setBlendMode(Phaser.BlendModes.ADD)));
      this.glowPool.forEach((img, i) => {
        const gl = glows[i];
        if (!gl || gl[0] < -80 || gl[0] > W + 80) { img.setVisible(false); return; }
        img.setVisible(true).setPosition(gl[0], gl[1]).setDisplaySize(gl[2], gl[2]).setTint(gl[3]).setAlpha(gl[4]);
      });
    }
    // Cierre del Mundo 3: la pinza con brazo se lleva la concha
    if (lv.ending === 'w3' && e) {
      const py = P.y + P.h / 2;
      this.w3Claw.setVisible(true).setTexture(w.endT >= 2.6 ? 'claw-arm-closed' : 'claw-arm-open').setPosition(e.clawX, py - 6);
      this.w3Shell.setVisible(!!(e.taken && e.taken !== 'none' && w.endT < 4.1));
      if (e.taken && e.taken !== 'none') this.w3Shell.setTexture(`shell-${e.taken}`).setPosition(e.clawX - 30, py + 4);
    }
    // Colores de cada cierre y la ola de la introducción
    const g = this.overlayG.clear();
    if (e && e.tide > 0) {
      if (lv.ending === 'w1') g.fillStyle(0x2A1640, e.tide * 0.42).fillRect(0, 0, W, H);
      if (lv.ending === 'w2') {
        const pts = [{ x: 0, y: H }];
        for (let x = 0; x <= W + 16; x += 16) pts.push({ x, y: w.waterY + Math.sin(x * 0.02 + T * 3) * 8 });
        pts.push({ x: W, y: H });
        g.fillStyle(0x1E6E8C, 0.72).fillPoints(pts, true);
        g.fillStyle(0x0A283C, e.tide * 0.5).fillRect(0, 0, W, H);
      }
      if (lv.ending === 'w4') g.fillStyle(0x0E1030, e.tide * 0.35).fillRect(0, 0, W, H);
      if (lv.ending === 'w6') g.fillStyle(0xFFD6A0, e.tide * 0.18).fillRect(0, 0, W, H);
    }
    if (w.state === 'intro') {
      const k = clamp(w.stT / 1.3, 0, 1), cx = -320 + k * (W + 640);
      const pts = [{ x: -10, y: 540 }, { x: -10, y: 300 }, ...quad(-10, 300, cx - 200, 280, cx - 60, 220, 10), ...quad(cx - 60, 220, cx + 10, 190, cx + 40, 240, 8), ...quad(cx + 40, 240, cx + 10, 230, cx - 10, 260, 6), ...quad(cx - 10, 260, cx + 40, 380, cx + 120, 540, 10)];
      g.fillStyle(0x4FB0C3, 0.92).fillPoints(pts, true);
      g.lineStyle(6, 0xF0FCFA, 0.95).strokePoints([...quad(cx - 140, 250, cx - 60, 205, cx + 10, 205, 8), ...quad(cx + 10, 205, cx + 40, 215, cx + 38, 238, 6)]);
    }
    this.fadeRect.setFillStyle(0x0A1E24, w.fade);
  }

  renderHud() {
    if (!this.showHud) return;
    const w = this.w, P = w.P;
    this.hudCount.setText(`${w.pearlsTaken} / ${w.pearls.length}`);
    this.hudShell.setVisible(!!P.shell);
    if (P.shell) this.hudShell.setTexture(`shell-${P.shell}`);
    this.hudEmpty.setVisible(!P.shell);
    const bg = this.bossHud.clear();
    if (w.boss && w.boss.locked && w.state === 'play') {
      for (let i = 0; i < 3; i++) {
        const x = W / 2 - 34 + i * 34, y = 34, alive = i < w.boss.hp;
        bg.fillStyle(0x0C2A30, 0.55).fillCircle(x, y, 14);
        bg.fillStyle(alive ? 0xFFE59A : 0xFFFFFF, alive ? 1 : 0.18).fillEllipse(x, y, 18, 12);
        if (alive) bg.fillStyle(0x2B2140, 1).fillEllipse(x, y, 5, 10);
      }
    }
    const t = w.cardT;
    const a = t <= 0 || t >= 2.8 ? 0 : t < 0.4 ? t / 0.4 : t > 2.2 ? (2.8 - t) / 0.6 : 1;
    this.card.setAlpha(clamp(a, 0, 1));
  }

  destroy() {
    for (const o of this.objs) o.destroy();
    for (const img of this.shellImgs.values()) img.destroy();
    for (const img of this.enemyImgs.values()) img.destroy();
  }
}
