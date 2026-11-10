// El mundo de Muda: todo lo que pasa en un nivel. No usa Phaser ni el navegador.
// La escena le entrega los controles una vez por cuadro con step(controls) y después
// vacía la cola de eventos con drain() para dibujar efectos y hacer sonar.
//
// controls: { left, right, jump, act } (true mientras el botón está apretado)
// Eventos: { type: 'sfx', name, ... }, { type: 'motif', rate, minor, oct }, { type: 'burst', x, y, n, col, sp },
//          { type: 'ring', x, y, vx }, { type: 'spray', x, y, vx, vy, shell }, { type: 'bubbles' }, { type: 'done' }
import {
  W, H, SUB, DT, DEF_PHYS, ACC, FRIC, AIR, COYOTE, JUMP_BUFFER, HINT_DELAY, MOTIF_EVERY,
  CRAB_W, CRAB_H_SHELL, CRAB_H_NAKED, SHELL_SIZE,
} from './constants.js';
import { LEVELS } from './levels.js';
import { clamp, lerp, ease, ov, approach, hits, moveBody } from './physics.js';
import { ENDINGS } from './endings.js';

export const SHELL_COLORS = { infancia: '#F7DDD3', espiral: '#62C8BA', caracol: '#AE98E2', erizo: '#EDB257', propia: '#FFF6EA' };

function newPlayer(x, feetY, shell) {
  const h = shell ? CRAB_H_SHELL : CRAB_H_NAKED;
  return {
    x, y: feetY - h, w: CRAB_W, h, vx: 0, vy: 0, onGround: false, ground: null, coyote: 0, buffer: 0,
    facing: 1, shell, airJumps: 0, inv: 0, spin: 0, gliding: false, hidden: false, walk: 0, tumble: 0,
  };
}

export function makeShell(type, x, y, fresh = false) {
  return { type, x, y, w: SHELL_SIZE, h: SHELL_SIZE, vx: 0, vy: 0, solid: true, fresh, onGround: false, ground: null };
}

export class World {
  // levelIndex: 0..5. resume: { cp, pearls } para seguir desde una estrella de mar.
  constructor(levelIndex = 0, { rng = Math.random, resume = null } = {}) {
    this.rng = rng;
    this.events = [];
    this.lvIndex = levelIndex;
    this.lv = LEVELS[levelIndex];
    this.g = this.lv.phys || DEF_PHYS;
    this.T = 0;
    this.stT = 0;
    this.endT = 0;
    this.fade = 0;
    this.shake = 0;
    this.camX = 0;
    this.cardT = 0;
    this.prev = { left: false, right: false, jump: false, act: false };
    this.held = { left: false, right: false, jump: false, act: false };

    this.solids = this.lv.solids.map((s) => ({ ...s, x0: s.x, y0: s.y, t: 0, gone: false, back: 0 }));
    this.zones = this.lv.zones || [];
    this.homes = this.lv.homes;
    const goal = this.lv.goal;
    this.pole = goal.type === 'pole' ? { x: goal.x, y: goal.y, w: 12, h: goal.h } : null;
    this.pearls = this.lv.pearls();
    this.cpIndex = 0;
    if (resume) {
      if (typeof resume.pearls === 'string' && resume.pearls.length === this.pearls.length) {
        this.pearls.forEach((p, k) => { p.taken = resume.pearls[k] === '1'; });
      }
      if (Number.isInteger(resume.cp)) this.cpIndex = clamp(resume.cp, 0, this.lv.cps.length - 1);
    }
    this.shells = this.lv.fresh.map((f) => makeShell(f.type, f.x, f.y, true));
    this.stats = { mudas: 0, caidas: 0, bonus: 0, ratio: 0 };
    this.floatTxt = null;
    this.ending = null;
    this.waterY = this.lv.water || 474;
    this.lightR = 250;
    this.mentor = this.lv.mentor
      ? { i: 0, x: this.lv.mentor[0].x, y: this.lv.mentor[0].y, moving: false, t: 0, dur: 1, facing: -1, walk: 0 }
      : null;
    this.resetEnemies();
    this.motifClock = 0.4;
    this.hintT = 0;
    this.boss = null;
    if (this.lv.boss) {
      this.boss = { hp: 3, phase: 'wait', t: 0, locked: false, claw: null, rain: [], spawned: 0, eye: 0, flinch: 0, sink: 0 };
      const gate = { x: this.lv.boss.gate, y: -1000, w: 40, h: 1600, k: 'rock', gate: true, gone: true, t: 0 };
      gate.x0 = gate.x; gate.y0 = gate.y;
      this.solids.push(gate);
    }

    if (this.cpIndex > 0) {
      if (this.lv.startShell) {
        const h = this.homes[this.lv.startShell];
        this.shells.push(makeShell(this.lv.startShell, h.x, h.y));
      }
      const cp = this.lv.cps[this.cpIndex];
      this.P = newPlayer(cp.x - 15, cp.y, null);
      this.camX = clamp(this.P.x - W * 0.4, 0, this.lv.world - W);
      this.state = 'play';
      this.fade = 1;
    } else if (this.lv.intro) {
      // Gancho del Mundo 1: una ola deja a Pinza en la playa.
      this.P = newPlayer(40, 250, this.lv.startShell);
      this.P.vx = 150; this.P.vy = -120; this.P.tumble = 1;
      this.state = 'intro';
      this.cardT = -1.2;
    } else {
      this.P = newPlayer(60, this.lv.cps[0].y, this.lv.startShell);
      this.state = 'play';
      this.fade = 1;
    }
  }

  /* ---------- Cola de eventos ---------- */
  emit(e) { this.events.push(e); }
  sfx(name, extra) { this.emit({ type: 'sfx', name, ...extra }); }
  burst(x, y, n, col, sp = 120) { this.emit({ type: 'burst', x, y, n, col, sp }); }
  drain() { const e = this.events; this.events = []; return e; }

  // Un cuadro de juego (1/60 s). Los bordes de botón (apretar/soltar) se calculan aquí.
  step(controls) {
    const c = { left: !!controls.left, right: !!controls.right, jump: !!controls.jump, act: !!controls.act };
    const edges = { jump: c.jump && !this.prev.jump, jumpUp: !c.jump && this.prev.jump, act: c.act && !this.prev.act };
    this.prev = c;
    this.held = c;
    for (let i = 0; i < SUB; i++) {
      this.update(DT, c, edges);
      edges.jump = edges.jumpUp = edges.act = false;
    }
  }

  get done() { return this.state === 'done'; }
  get pearlsTaken() { return this.pearls.filter((p) => p.taken).length; }

  /* ---------- Ayudas ---------- */
  solidsLive() { return this.solids.filter((s) => !s.gone); }
  colliders(except) { return this.solidsLive().concat(this.shells.filter((s) => s.solid && s !== except)); }
  lightAngle(L) { return Math.sin(this.T * 2 * Math.PI / L.p + L.ph) * L.half; }

  resetEnemies() {
    this.enemies = this.lv.enemies.map((d) => {
      const e = { ...d, alive: true, deadT: 0, dir: -1, ph: this.rng() * 6 };
      if (d.t === 'gull') { e.w = 40; e.h = 20; e.y0 = d.y; }
      else if (d.t === 'urchin') { e.w = 26; e.h = 22; }
      else if (d.t === 'jelly') { e.w = 30; e.h = 28; e.mid = (d.y1 + d.y2) / 2; e.amp = (d.y2 - d.y1) / 2; e.y = e.mid; }
      else { e.w = 28; e.h = 20; }
      return e;
    });
  }

  /* ---------- Plataformas móviles y frágiles ---------- */
  updateSolids(dt) {
    const P = this.P;
    for (const s of this.solids) {
      if (s.mv) {
        const ph = this.T * 2 * Math.PI / s.mv.p;
        const nx = s.mv.ax === 'x' ? s.x0 + Math.sin(ph) * s.mv.amp : s.x0;
        const ny = s.mv.ax === 'y' ? s.y0 + Math.sin(ph) * s.mv.amp : s.y0;
        const dx = nx - s.x, dy = ny - s.y;
        s.x = nx; s.y = ny;
        if (P.ground === s) { P.x += dx; P.y += dy; }
        for (const o of this.shells) if (o.ground === s) { o.x += dx; o.y += dy; }
      }
      if (s.k === 'crumble') {
        if (s.gone) {
          s.back -= dt;
          if (s.back <= 0 && !ov(P, s)) { s.gone = false; s.t = 0; }
        } else if (s.t > 0 || P.ground === s) {
          s.t += dt;
          if (s.t > 0.55) { s.gone = true; s.back = 3; this.sfx('crack'); this.burst(s.x + s.w / 2, s.y + 6, 10, '#E9DCD2', 90); }
        }
      }
    }
  }

  /* ---------- Conchas ---------- */
  nearestShell() {
    const P = this.P;
    const box = { x: P.x - 12, y: P.y - 8, w: P.w + 24, h: P.h + 16 };
    let best = null, bd = 1e9;
    for (const s of this.shells) {
      if (!s.solid || !ov(box, s)) continue;
      const d = Math.abs(s.x + 15 - (P.x + P.w / 2));
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  // Deja una concha en el suelo: detrás de Pinza, si no cabe delante, y si no, debajo (y Pinza sube).
  placeShell(type) {
    const P = this.P;
    const feet = P.y + P.h, sy = feet - SHELL_SIZE;
    const behind = P.facing > 0 ? P.x - 32 : P.x + P.w + 2;
    const front = P.facing > 0 ? P.x + P.w + 2 : P.x - 32;
    const list = this.colliders();
    for (const x of [behind, front]) {
      const box = { x, y: sy, w: SHELL_SIZE, h: SHELL_SIZE };
      if (!hits(box, list)) { this.shells.push(makeShell(type, x, sy)); return true; }
    }
    const box = { x: P.x + (P.w - SHELL_SIZE) / 2, y: sy, w: SHELL_SIZE, h: SHELL_SIZE };
    const np = { x: P.x, y: sy - P.h, w: P.w, h: P.h };
    if (hits(np, list) || hits(box, this.solidsLive())) return false;
    P.y = np.y;
    this.shells.push(makeShell(type, box.x, box.y));
    return true;
  }

  takeOff() { const P = this.P; P.shell = null; P.h = CRAB_H_NAKED; P.y += CRAB_H_SHELL - CRAB_H_NAKED; }
  putOn(type) { const P = this.P; P.y -= CRAB_H_SHELL - CRAB_H_NAKED; P.h = CRAB_H_SHELL; P.shell = type; }

  throwShell() {
    const P = this.P;
    const type = P.shell;
    this.takeOff();
    const s = makeShell(type, P.x + P.facing * 6, P.y - 26);
    s.vx = 520 * P.facing; s.vy = -640; s.solid = false; s.thrown = true;
    this.shells.push(s);
    this.stats.mudas++;
    this.sfx('throw');
  }

  // El botón de concha: cambiar, ponerse o soltar. Frente al Acaparador, lanzar.
  doAct() {
    const P = this.P;
    const near = this.nearestShell();
    if (this.boss && this.boss.locked && P.shell && !near) { this.throwShell(); return; }
    if (near && P.shell) {
      const old = P.shell;
      this.shells.splice(this.shells.indexOf(near), 1);
      P.shell = near.type;
      if (!this.placeShell(old)) { this.shells.push(near); P.shell = old; this.sfx('bonk'); return; }
      this.stats.mudas++;
      this.sfx('pick');
      this.burst(P.x + 15, P.y + 10, 10, SHELL_COLORS[P.shell]);
    } else if (near) {
      const grown = { x: P.x, y: P.y - (CRAB_H_SHELL - CRAB_H_NAKED), w: P.w, h: CRAB_H_SHELL };
      if (hits(grown, this.colliders(near))) { this.sfx('bonk'); return; }
      this.shells.splice(this.shells.indexOf(near), 1);
      this.putOn(near.type);
      this.sfx('pick');
      this.burst(P.x + 15, P.y + 10, 12, SHELL_COLORS[P.shell]);
    } else if (P.shell) {
      const old = P.shell;
      this.takeOff();
      if (!this.placeShell(old)) { this.putOn(old); this.sfx('bonk'); return; }
      this.stats.mudas++;
      this.sfx('drop');
    } else this.sfx('bonk');
  }

  popShell() {
    const P = this.P;
    const type = P.shell;
    this.takeOff();
    const s = makeShell(type, P.x, P.y - 32);
    s.vx = -P.facing * 150; s.vy = -360; s.solid = false;
    this.shells.push(s);
  }

  updateShells(dt) {
    const g = this.g;
    for (const s of this.shells) {
      if (s.carried) continue;
      s.vy = Math.min(s.vy + (s.thrown ? 900 : g.grav) * dt, g.maxf);
      moveBody(s, dt, this.solidsLive().concat(this.shells.filter((o) => o !== s && o.solid && !o.carried)));
      if (s.thrown) {
        const e = this.lv.boss.eye, d = Math.hypot(s.x + 15 - e.x, s.y + 15 - e.y);
        if (d < 40 && this.boss.eye > 0.6 && this.boss.phase === 'eye') { s.dead = true; this.hitBoss(); continue; }
        if (d < 40) { s.vx = -Math.abs(s.vx) * 0.3; this.sfx('bonk'); }
        if (s.onGround) s.thrown = false;
      }
      if (s.onGround) s.vx *= 0.82;
      if (!s.solid && s.onGround && !ov(s, this.P)) s.solid = true;
      if (s.y > H + 60 && this.homes[s.type]) {
        const h = this.homes[s.type];
        s.x = h.x; s.y = h.y; s.vx = s.vy = 0; s.solid = true;
      }
    }
    if (this.shells.some((s) => s.dead)) this.shells = this.shells.filter((s) => !s.dead);
  }

  /* ---------- El Acaparador (jefe final) ---------- */
  needShell() {
    return !this.P.shell && this.shells.filter((s) => !s.carried && s.x > this.lv.boss.arena).length === 0;
  }

  lockArena() {
    const b = this.boss;
    b.locked = true; b.phase = 'intro'; b.t = 0;
    for (const s of this.solids) if (s.gate) s.gone = false;
    this.sfx('rumble');
    this.shake = 0.35;
  }

  bossNext(ph) { const b = this.boss; b.phase = ph; b.t = 0; b.spawned = 0; }

  hitBoss() {
    const b = this.boss;
    b.hp--; b.flinch = 0.9; b.eye = 1;
    this.bossNext('hurt');
    this.sfx('bossHit');
    this.shake = 0.45;
    const e = this.lv.boss.eye;
    this.burst(e.x, e.y, 22, '#FFE39A', 220);
  }

  updateBoss(dt) {
    const b = this.boss, P = this.P;
    if (!b.locked) return;
    b.t += dt;
    if (b.flinch > 0) b.flinch -= dt;
    const spd = 1 + (3 - b.hp) * 0.15; // el jefe acelera con cada golpe
    if (b.phase === 'intro') {
      if (b.t > 1.6) this.bossNext('sweep');
    } else if (b.phase === 'sweep') {
      if (!b.claw) { b.claw = { x: 4110, go: false }; this.sfx('rumble'); }
      if (b.t > 0.9 / spd) { b.claw.go = true; b.claw.x -= 760 * spd * dt; }
      if (b.claw.go && ov(P, { x: b.claw.x - 90, y: 408, w: 146, h: 32 })) this.hurt();
      // En el último golpe no caen conchas: hay que lanzar la propia (el dilema).
      if (b.claw && b.claw.x < 3300) { b.claw = null; this.bossNext(b.hp === 1 && !this.needShell() ? 'eye' : 'rain'); }
    } else if (b.phase === 'rain') {
      const n = b.hp === 1 ? 1 : 3;
      if (b.spawned < n && b.t > 0.3 + b.spawned * 0.7) {
        b.spawned++;
        const types = ['espiral', 'caracol', 'erizo'];
        const near = clamp(P.x + (this.rng() - 0.5) * 360, 3450, 3980);
        b.rain.push({ x: b.spawned === 1 ? near : 3460 + this.rng() * 520, y: -60, vy: 0, warn: 0.9, type: types[Math.floor(this.rng() * 3)] });
      }
      if (b.spawned >= n && b.rain.length === 0 && b.t > 1.2) this.bossNext('eye');
    } else if (b.phase === 'eye') {
      b.eye = Math.min(1, b.eye + dt * 4);
      if (b.t > 2.8 + (b.hp === 1 ? 1.2 : 0)) { b.eye = 0; this.bossNext('sweep'); }
    } else if (b.phase === 'hurt') {
      b.eye = Math.max(0, b.eye - dt * 2);
      if (b.t > 1.3) {
        if (b.hp <= 0) { this.bossNext('dead'); this.startEnding(); } else this.bossNext('sweep');
      }
    }
    for (const r of b.rain) {
      if (r.warn > 0) { r.warn -= dt; continue; }
      r.vy += 1800 * dt; r.y += r.vy * dt;
      if (ov(P, { x: r.x - 13, y: r.y + 2, w: 26, h: 26 })) this.hurt();
      if (r.y + 30 >= 440) {
        r.done = true;
        if (this.shells.length < 5) this.shells.push(makeShell(r.type, r.x - 15, 410));
        this.burst(r.x, 436, 8, '#F4E9F2', 100);
        this.sfx('drop');
      }
    }
    b.rain = b.rain.filter((r) => !r.done);
  }

  /* ---------- Jugador y peligros ---------- */
  hurt() {
    const P = this.P;
    if (P.inv > 0 || this.state !== 'play') return;
    if (P.shell) {
      this.popShell();
      P.inv = 1.5; P.vy = -300; P.vx = -P.facing * 180;
      this.sfx('hit');
      this.shake = 0.25;
    } else this.die();
  }

  die() {
    const P = this.P;
    this.state = 'dying'; this.stT = 0;
    P.deadShell = P.shell; P.vy = -420; P.vx = 0;
    this.stats.caidas++;
    this.sfx('die');
    this.shake = 0.2;
  }

  respawn() {
    const cp = this.lv.cps[this.cpIndex];
    this.P = newPlayer(cp.x - 15, cp.y, this.P.deadShell || null);
    this.P.inv = 1;
    this.resetEnemies();
    for (const s of this.solids) if (s.k === 'crumble') { s.gone = false; s.t = 0; }
    const b = this.boss;
    if (b && b.locked) { b.claw = null; b.rain = []; b.phase = 'intro'; b.t = 0; b.eye = 0; this.camX = this.lv.boss.arena; }
    this.fade = 1;
    this.state = 'play';
  }

  updatePlay(dt, c, edges) {
    const P = this.P, g = this.g, lv = this.lv;
    const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
    let push = 0, lift = 0;
    for (const z of this.zones) if (ov(P, z)) { push += z.fx || 0; lift += z.fy || 0; }
    const a = P.onGround ? (dir ? ACC : FRIC) : AIR;
    P.vx = approach(P.vx, dir * g.run + push, a * dt);
    if (dir) P.facing = dir;
    if (edges.jump) P.buffer = JUMP_BUFFER; else P.buffer -= dt;
    if (P.onGround) { P.coyote = COYOTE; P.airJumps = P.shell === 'espiral' ? 1 : 0; } else P.coyote -= dt;
    if (P.buffer > 0) {
      if (P.coyote > 0) {
        P.vy = -g.jump; P.coyote = 0; P.buffer = 0; P.onGround = false; P.ground = null;
        this.sfx('jump');
      } else if (P.airJumps > 0) {
        P.vy = -g.jump * 0.95; P.airJumps--; P.buffer = 0; P.spin = 1;
        this.sfx('dj');
        this.burst(P.x + 15, P.y + P.h, 8, '#EAF8F6', 90);
      }
    }
    if (edges.jumpUp && P.vy < 0) P.vy *= 0.45; // salto corto al soltar
    P.vy += (g.grav + lift) * dt;
    if (lift && P.vy < -320) P.vy = -320;
    P.gliding = false;
    if (P.shell === 'caracol' && c.jump && P.vy > 0) {
      if (P.vy > g.glide) P.vy = g.glide;
      P.gliding = true;
      if (this.rng() < dt * 14) this.emit({ type: 'ring', x: P.x + 15 - P.facing * 14, y: P.y + 6, vx: -P.facing * 30 });
    }
    if (P.vy > g.maxf) P.vy = g.maxf;
    moveBody(P, dt, this.colliders());
    if (P.spin > 0) P.spin = Math.max(0, P.spin - dt * 2.4);
    if (P.inv > 0) P.inv -= dt;
    P.walk += Math.abs(P.vx) * dt;
    if (edges.act) this.doAct();

    // La mirada del Acaparador: quieto y dentro de tu concha, la luz no te ve.
    P.hidden = !!(P.shell && P.onGround && Math.abs(P.vx) < 30 && !c.left && !c.right);
    if (lv.lights) {
      for (const L of lv.lights) {
        const ang = Math.atan2(P.x + P.w / 2 - L.x, P.y + P.h / 2 + 60);
        if (Math.abs(ang - this.lightAngle(L)) < 0.13 && !P.hidden) {
          if (P.inv <= 0) this.sfx('alarm');
          this.hurt();
          break;
        }
      }
      if (this.state !== 'play') return;
    }

    const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
    for (const p of this.pearls) {
      if (p.taken) continue;
      if (Math.abs(p.x - cx) < 20 && Math.abs(p.y - cy) < P.h / 2 + 8) {
        p.taken = true;
        this.sfx('pearl');
        this.burst(p.x, p.y, 5, '#FFFDF2', 70);
      }
    }
    lv.cps.forEach((cp, i) => {
      if (i > this.cpIndex && Math.abs(cx - cp.x) < 26 && Math.abs(P.y + P.h - cp.y) < 40) {
        this.cpIndex = i;
        this.sfx('cp');
        this.burst(cp.x, cp.y - 10, 12, '#FF9E7A', 110);
        this.emit({ type: 'checkpoint', cp: i });
      }
    });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const eb = { x: e.x + 3, y: e.y + 3, w: e.w - 6, h: e.h - 4 };
      if (!ov(P, eb)) continue;
      if (e.t === 'urchin' && P.shell === 'erizo') continue; // la concha erizo protege de los erizos
      const stompable = e.t === 'flea' || e.t === 'gull';
      if (stompable && P.vy > 0 && P.y + P.h - P.vy * dt <= eb.y + 10) {
        e.alive = false; e.deadT = 0;
        P.vy = c.jump ? -g.jump * 0.93 : -g.jump * 0.67;
        P.airJumps = P.shell === 'espiral' ? 1 : 0;
        this.sfx('stomp');
        this.burst(e.x + e.w / 2, e.y + e.h / 2, 10, '#F6E7C8', 120);
      } else this.hurt();
    }
    // Pista fantasma: atascado frente a la pared un rato, un cangrejo fantasma muestra el movimiento.
    const hn = lv.hint;
    if (hn && this.hintT > -1) {
      if (P.y + P.h <= hn.top + 2 && P.x + P.w > hn.wall) this.hintT = -999;
      else if (P.x + P.w > hn.wall - 380 && P.x < hn.wall && P.y + P.h > hn.top + 20) this.hintT += dt;
      else this.hintT = Math.max(0, this.hintT - dt * 0.5);
    }
    if (P.y > H + 30) { this.die(); return; }
    const goal = lv.goal, m = this.mentor;
    if (goal.type === 'pole' && ov(P, this.pole)) this.startEnding();
    else if (goal.type === 'pearl' && Math.hypot(cx - goal.x, cy - goal.y) < 32) this.startEnding();
    else if (goal.type === 'mentor' && m && m.i === lv.mentor.length - 1 && !m.moving && Math.abs(cx - m.x) < 50 && P.onGround) this.startEnding();
  }

  get hintVisible() { return this.hintT > HINT_DELAY && this.state === 'play'; }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (!e.alive) { e.deadT += dt; continue; }
      if (e.t === 'flea' || e.t === 'gull') {
        e.x += e.dir * (e.t === 'gull' ? 85 : 60) * dt;
        if (e.x < e.min) { e.x = e.min; e.dir = 1; }
        if (e.x + e.w > e.max) { e.x = e.max - e.w; e.dir = -1; }
        if (e.t === 'gull') e.y = e.y0 + Math.sin(this.T * 2.1 + e.ph) * e.amp;
      } else if (e.t === 'jelly') {
        e.y = e.mid + Math.sin(this.T * 1.3 + e.ph) * e.amp - e.h / 2;
      }
    }
  }

  // La mentora del Mundo 4 avanza al siguiente punto cuando Pinza se acerca, y lo espera.
  updateMentor(dt) {
    const m = this.mentor, wps = this.lv.mentor, P = this.P;
    if (m.moving) {
      m.t += dt;
      const a = wps[m.i - 1], b = wps[m.i], k = clamp(m.t / m.dur, 0, 1);
      m.x = lerp(a.x, b.x, k);
      m.y = lerp(a.y, b.y, k) - (b.hop ? Math.sin(k * Math.PI) * 110 : 0);
      m.walk += 120 * dt;
      if (k >= 1) { m.moving = false; m.x = b.x; m.y = b.y; }
    } else if (m.i < wps.length - 1 && P.x + 15 > wps[m.i].x - 170) {
      m.i++;
      const a = wps[m.i - 1], b = wps[m.i];
      m.moving = true; m.t = 0; m.dur = Math.abs(b.x - a.x) / (b.hop ? 300 : 120); m.facing = b.x > a.x ? 1 : -1;
    } else m.facing = P.x + 15 < m.x ? -1 : 1;
  }

  /* ---------- Finales ---------- */
  startEnding() {
    const P = this.P, lv = this.lv, goal = lv.goal;
    this.state = 'ending';
    this.endT = 0;
    P.vx = 0; P.vy = 0;
    this.ending = { tide: 0, claw: 0, rumble: false, motif: false };
    if (goal.type === 'pole') {
      // Como la bandera de Super Mario Bros.: más alto, más perlas.
      this.stats.ratio = clamp((goal.ground - P.y) / goal.h, 0, 1);
      this.stats.bonus = Math.round(this.stats.ratio * 10);
      P.x = this.pole.x - P.w + 2;
      this.floatTxt = { txt: '+' + this.stats.bonus, x: this.pole.x + 10, y: P.y, t: 0 };
      this.sfx('flag', { r: this.stats.ratio });
      this.ending.endCam = lv.world - W;
    }
    ENDINGS[lv.ending].start?.(this);
  }

  // Bajar por la boya y caminar un poco.
  poleSlide(dt) {
    const P = this.P, goal = this.lv.goal, e = this.ending;
    if (this.endT < 1.2) { P.y = Math.min(P.y + 240 * dt, goal.ground - P.h); this.camX = lerp(this.camX, e.endCam, 0.08); }
    else if (this.endT < 1.8) { P.y = goal.ground - P.h; P.facing = 1; P.x += 90 * dt; P.walk += 90 * dt; this.camX = lerp(this.camX, e.endCam, 0.1); }
  }

  updateEnding(dt) {
    this.endT += dt;
    if (this.floatTxt) this.floatTxt.t += dt;
    const E = ENDINGS[this.lv.ending];
    E.update(this, dt);
    if (this.endT >= E.len && this.state === 'ending') {
      this.state = 'done';
      this.emit({ type: 'done' });
    }
  }

  // Resumen del nivel para la pantalla de fin.
  summary() {
    const pole = this.lv.goal.type === 'pole';
    return {
      level: this.lvIndex,
      pearls: this.pearlsTaken + this.stats.bonus,
      maxPearls: this.pearls.length + (pole ? 10 : 0),
      buoy: pole ? Math.round(this.stats.ratio * 100) : null,
      mudas: this.stats.mudas,
      caidas: this.stats.caidas,
    };
  }

  /* ---------- Bucle ---------- */
  update(dt, c, edges) {
    this.T += dt;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 2.5);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    this.cardT += dt;
    if (this.state === 'done') return;
    this.updateSolids(dt);
    const P = this.P, g = this.g;

    if (this.state === 'intro') {
      this.stT += dt;
      if (this.stT > 0.5) {
        P.vy = Math.min(P.vy + g.grav * dt, g.maxf);
        moveBody(P, dt, this.colliders());
        if (P.onGround) P.vx = approach(P.vx, 0, FRIC * dt);
        P.tumble = Math.max(0, P.tumble - dt * 1.2);
      }
      if (this.stT > 1.6) { this.state = 'play'; P.tumble = 0; }
      return;
    }
    if (this.state === 'dying') {
      this.stT += dt;
      P.vy += g.grav * dt;
      P.y += P.vy * dt;
      if (this.stT > 1.0) this.respawn();
      this.updateEnemies(dt);
      return;
    }
    if (this.state === 'ending') {
      this.updateEnding(dt);
      this.updateShells(dt);
      this.updateEnemies(dt);
      return;
    }
    this.updatePlay(dt, c, edges);
    if (this.state !== 'play') return;
    this.updateShells(dt);
    this.updateEnemies(dt);
    if (this.mentor) this.updateMentor(dt);
    if (this.boss) {
      if (!this.boss.locked && this.P.x > this.lv.boss.arena + 60) this.lockArena();
      this.updateBoss(dt);
    }
    const look = this.P.facing * 70;
    if (this.boss && this.boss.locked) this.camX = lerp(this.camX, this.lv.boss.arena, 0.1);
    else this.camX = lerp(this.camX, clamp(this.P.x - W * 0.42 + look, 0, this.lv.world - W), 0.09);
    // El leitmotiv vuelve cada tanto. En la poza del Mundo 1 (el valle) suena más lento.
    this.motifClock -= dt;
    if (this.motifClock <= 0) {
      const mu = this.lv.music;
      const calm = this.lv.n === 1 && this.P.x > 2900 && this.P.x < 3400;
      this.emit({ type: 'motif', rate: (mu.rate || 1) * (calm ? 0.75 : 1), minor: !!mu.minor, oct: mu.oct || 1 });
      this.motifClock = MOTIF_EVERY;
    }
  }
}
