// Los cierres de cada mundo (escenas cortas sin control del jugador).
// Cada uno cambia el estado del mundo con el tiempo; la vista solo lo dibuja.
import { W } from './constants.js';
import { clamp, lerp, ease } from './physics.js';
import { makeShell } from './world.js';

export const ENDINGS = {
  // Mundo 1: un cangrejo pequeño encuentra tu concha de infancia (callback) y aparece el Acaparador (cliffhanger).
  w1: {
    len: 13.6,
    start(w) {
      const s = w.shells.find((o) => o.type === 'infancia' && o.solid);
      w.ending.shell = s || null;
      if (s) w.ending.baby = { x: s.x - 240, y: s.y + 30, worn: false, facing: 1, hop: 0 };
    },
    update(w, dt) {
      const e = w.ending;
      w.poleSlide(dt);
      if (w.endT >= 1.8 && !e.shell && w.endT < 9) w.endT = 9;
      if (e.shell && w.endT >= 1.8 && w.endT < 9) {
        const target = clamp(e.shell.x - W * 0.45, 0, w.lv.world - W);
        if (w.endT < 3.6) w.camX = lerp(e.endCam, target, ease((w.endT - 1.8) / 1.8));
        else if (w.endT < 7.4) {
          w.camX = target;
          const b = e.baby;
          if (!e.motif && w.endT > 3.7) { e.motif = true; w.emit({ type: 'motif', rate: 0.62 }); }
          if (w.endT < 6.0) { b.x = lerp(e.shell.x - 240, e.shell.x, ease((w.endT - 3.6) / 2.4)); b.facing = 1; }
          else if (w.endT < 6.5) {
            b.worn = true;
            b.hop = Math.sin((w.endT - 6) / 0.5 * Math.PI) * 14;
            const i = w.shells.indexOf(e.shell);
            if (i >= 0) w.shells.splice(i, 1);
          } else { b.hop = 0; b.facing = -1; b.x -= 55 * dt; }
        } else w.camX = lerp(target, e.endCam, ease((w.endT - 7.4) / 1.6));
      }
      if (w.endT >= 9) {
        w.camX = e.endCam;
        e.tide = ease((w.endT - 9) / 3);
        w.waterY = w.lv.water + e.tide * 60;
        if (!e.rumble && w.endT > 9.6) { e.rumble = true; w.sfx('rumble'); }
        e.claw = ease((w.endT - 10.6) / 2);
        w.shake = Math.max(w.shake, 0.05 + 0.1 * e.tide * (w.endT < 12.6 ? 1 : 0));
      }
    },
  },

  // Mundo 2: la marea sube de golpe y arrastra a Pinza mar adentro.
  w2: {
    len: 6.2,
    update(w, dt) {
      const e = w.ending, P = w.P;
      w.poleSlide(dt);
      if (w.endT >= 1.8) {
        w.camX = e.endCam;
        const k = ease((w.endT - 1.8) / 3);
        w.waterY = lerp(w.lv.water, -80, k);
        e.tide = k;
        if (!e.rumble) { e.rumble = true; w.sfx('wave'); }
        if (w.waterY < P.y + P.h) { P.y -= 60 * dt; P.x += 40 * dt; P.tumble = Math.min(1, P.tumble + dt * 0.6); }
        if (w.rng() < dt * 30) w.emit({ type: 'bubble', x: w.camX + w.rng() * W });
      }
    },
  },

  // Mundo 3: la prueba. El Acaparador le arranca la concha a Pinza.
  w3: {
    len: 5.8,
    start(w) { w.ending.clawX = W + 260; w.ending.taken = null; w.sfx('rumble'); },
    update(w, dt) {
      const e = w.ending, P = w.P;
      w.lightR = lerp(250, 130, ease(w.endT / 1.2));
      const px = P.x + P.w / 2 - w.camX;
      if (w.endT > 1.4 && w.endT < 2.6) e.clawX = lerp(W + 260, px + 40, ease((w.endT - 1.4) / 1.2));
      if (w.endT >= 2.6 && !e.taken) {
        e.taken = P.shell || 'none';
        if (P.shell) w.takeOff();
        for (const s of w.shells) s.carried = true;
        w.sfx('hit');
        w.shake = 0.4;
      }
      if (w.endT > 2.7) {
        e.clawX = lerp(px + 40, W + 300, ease((w.endT - 2.7) / 1.3));
        for (const s of w.shells) { s.x += 520 * dt; s.y -= 40 * dt; }
      }
      if (w.endT > 4) w.lightR = lerp(130, 90, ease((w.endT - 4) / 1.5));
    },
  },

  // Mundo 4: Pinza alcanza a la mentora y cae la noche.
  w4: {
    len: 6.4,
    start(w) { w.ending.camFrom = w.camX; w.emit({ type: 'motif', rate: 0.55, minor: true }); },
    update(w, dt) {
      const P = w.P, m = w.mentor;
      const target = m.x - 46;
      if (P.x < target - 2) { P.x = Math.min(target, P.x + 70 * dt); P.facing = 1; P.walk += 70 * dt; }
      m.facing = 1;
      w.camX = lerp(w.ending.camFrom, clamp(m.x - W * 0.35, 0, w.lv.world - W), ease(w.endT / 2));
      w.ending.tide = ease((w.endT - 0.8) / 3.5);
    },
  },

  // Mundo 5: amanece.
  w5: {
    len: 6.8,
    update(w, dt) {
      w.poleSlide(dt);
      if (w.endT > 1.8) {
        w.ending.tide = ease((w.endT - 1.8) / 3.6);
        if (!w.ending.motif) { w.ending.motif = true; w.emit({ type: 'motif', rate: 0.7 }); }
      }
    },
  },

  // Mundo 6: el Acaparador se hunde, las conchas liberadas encuentran dueño y Pinza recibe una casa propia.
  w6: {
    len: 9.6,
    update(w, dt) {
      const e = w.ending, P = w.P, boss = w.boss;
      boss.sink = ease(w.endT / 1.8);
      boss.claw = null;
      boss.rain = [];
      if (w.endT < 1.8) {
        w.shake = Math.max(w.shake, 0.15);
        if (w.rng() < dt * 40) {
          const types = ['espiral', 'caracol', 'erizo', 'infancia'];
          w.emit({
            type: 'spray', x: 4160 + w.rng() * 220, y: 160 + w.rng() * 220,
            vx: -120 - w.rng() * 320, vy: -220 - w.rng() * 220, shell: types[Math.floor(w.rng() * 4)],
          });
        }
      }
      if (!e.spawned && w.endT > 1.8) {
        e.spawned = true;
        w.shells = [];
        const types = ['espiral', 'caracol', 'erizo', 'caracol'];
        const xs = [3560, 3700, 3880, 4020];
        e.free = types.map((t, i) => makeShell(t, xs[i], 410));
        w.shells.push(...e.free);
        e.crabs = e.free.map((s, i) => ({ x: 3330 - i * 80, target: s, worn: null }));
        e.baby = { x: 3260 };
        w.emit({ type: 'motif', rate: 1 });
      }
      if (e.crabs) {
        for (const c of e.crabs) {
          if (!c.worn) {
            c.x = Math.min(c.target.x + 15, c.x + 110 * dt);
            if (c.x >= c.target.x + 14) {
              c.worn = c.target.type;
              const k = w.shells.indexOf(c.target);
              if (k >= 0) w.shells.splice(k, 1);
            }
          } else c.x += 60 * dt;
        }
        e.baby.x += 70 * dt;
      }
      if (w.endT > 3.4 && !e.propia) e.propia = { x: clamp(P.x + 60, 3480, 3980), y: 300 };
      if (e.propia && !e.worn) e.propia.y = Math.min(410, e.propia.y + 70 * dt);
      if (e.propia && w.endT > 5.2 && !e.worn) {
        e.worn = true;
        if (P.shell) w.takeOff();
        w.putOn('propia');
        w.sfx('pick');
        w.burst(P.x + 15, P.y + 10, 18, '#FFE9B8', 140);
      }
      if (w.endT > 6) { P.facing = 1; P.x = Math.min(P.x + 70 * dt, 4080); P.walk += 70 * dt; }
      e.tide = ease((w.endT - 1.8) / 4);
    },
  },
};
