import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/world.js';
import { LEVELS } from '../src/core/levels.js';
import { FixedStep } from '../src/core/fixed-step.js';
import { loadProgress, recordResult, emptyProgress } from '../src/core/progress.js';

const IDLE = { left: false, right: false, jump: false, act: false };
const ctl = (o) => ({ ...IDLE, ...o });

// Números al azar repetibles, para que las pruebas den siempre lo mismo.
function seeded(seed = 7) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function run(w, frames, c = IDLE) {
  for (let i = 0; i < frames; i++) w.step(typeof c === 'function' ? c(i) : c);
}

// Pone a Pinza en el suelo en una posición x, con o sin concha.
function place(w, x, feetY, shell = w.P.shell) {
  const P = w.P;
  P.shell = shell;
  P.h = shell ? 36 : 22;
  P.x = x; P.y = feetY - P.h; P.vx = P.vy = 0;
  w.state = 'play';
  run(w, 2);
}

test('los seis mundos se crean y avanzan 10 segundos sin errores', () => {
  LEVELS.forEach((_, i) => {
    const w = new World(i, { rng: seeded(i + 1) });
    run(w, 600, (f) => ctl({ right: f % 200 < 150, jump: f % 45 < 10 }));
    assert.ok(['play', 'dying', 'ending', 'done'].includes(w.state), `mundo ${i + 1}: ${w.state}`);
    w.drain();
  });
});

test('el paso fijo da el mismo número de cuadros a 60 y a 120 Hz', () => {
  let a = 0, b = 0;
  const s60 = new FixedStep(() => a++), s120 = new FixedStep(() => b++);
  for (let i = 0; i < 60; i++) s60.update(1000 / 60);
  for (let i = 0; i < 120; i++) s120.update(1000 / 120);
  assert.equal(a, 60);
  assert.equal(Math.abs(a - b) <= 1, true);
});

test('soltar y recoger la concha (punto 49: enable, don\'t tell)', () => {
  const w = new World(0, { rng: seeded() });
  run(w, 240); // termina la ola de la introducción
  assert.equal(w.state, 'play');
  assert.equal(w.P.shell, 'infancia');
  run(w, 1, ctl({ act: true }));
  run(w, 1);
  assert.equal(w.P.shell, null);
  assert.equal(w.stats.mudas, 1);
  assert.equal(w.shells.some((s) => s.type === 'infancia'), true);
  run(w, 1, ctl({ act: true }));
  assert.equal(w.P.shell, 'infancia');
});

test('la primera pared del Mundo 1 solo se sube con la concha como escalón', () => {
  // Sin escalón: salta contra la pared y no llega arriba.
  const a = new World(0, { rng: seeded() });
  run(a, 240);
  place(a, 1100 - 32, 440, 'infancia');
  run(a, 90, (f) => ctl({ right: true, jump: f < 30 }));
  assert.ok(a.P.y + a.P.h > 322 + 1, 'sin escalón no debería subir');

  // Con escalón: deja la concha junto a la pared, se sube y salta.
  const b = new World(0, { rng: seeded() });
  run(b, 240);
  place(b, 1100 - 30 - 2, 440, 'infancia');
  b.P.facing = -1; // mirando hacia atrás, la concha queda entre Pinza y la pared
  run(b, 1, ctl({ act: true }));
  run(b, 2);
  const step = b.shells.find((s) => s.type === 'infancia');
  assert.ok(step, 'la concha quedó en el suelo');
  // subirse a la concha y saltar hacia la pared
  b.P.x = step.x; b.P.y = step.y - b.P.h; b.P.vx = 0;
  run(b, 2);
  run(b, 80, (f) => ctl({ right: true, jump: f < 35 }));
  assert.ok(b.P.y + b.P.h <= 322 + 1, `con escalón debería subir (pies en ${b.P.y + b.P.h})`);
});

test('la concha espiral da un doble salto', () => {
  const w = new World(0, { rng: seeded() });
  run(w, 240);
  place(w, 1200, 322, 'espiral');
  run(w, 10, ctl({ jump: true }));
  run(w, 1);
  assert.equal(w.P.airJumps, 1);
  run(w, 10, ctl({ jump: true }));
  assert.equal(w.P.airJumps, 0);
  assert.ok(w.P.spin > 0, 'gira al hacer el doble salto');
});

test('la concha erizo protege de los erizos; otra concha no', () => {
  const w = new World(1, { rng: seeded() });
  place(w, 1010, 440, 'erizo');
  run(w, 60, ctl({ right: true }));
  assert.equal(w.P.shell, 'erizo');
  assert.equal(w.stats.caidas, 0);

  const v = new World(1, { rng: seeded() });
  place(v, 960, 440, 'caracol');
  run(v, 30, ctl({ right: true }));
  assert.notEqual(v.P.shell, 'caracol', 'pierde la concha al tocar un erizo');
});

test('la concha caracol planea: cae más lento con el salto apretado', () => {
  const w = new World(0, { rng: seeded() });
  run(w, 240);
  place(w, 3100, 322, 'caracol');
  run(w, 50, ctl({ jump: true }));
  assert.equal(w.P.gliding, true);
  assert.ok(w.P.vy <= w.g.glide + 0.01);
});

test('caer al agua lleva a la última estrella de mar', () => {
  const w = new World(0, { rng: seeded() });
  run(w, 240);
  w.cpIndex = 1;
  place(w, 1650, 322, null);
  for (let f = 0; f < 60 && w.state === 'play'; f++) w.step(ctl({ right: true }));
  assert.equal(w.state, 'dying');
  run(w, 90);
  assert.equal(w.stats.caidas, 1);
  assert.equal(w.state, 'play');
  assert.ok(Math.abs(w.P.x - (LEVELS[0].cps[1].x - 15)) < 40, `reaparece en la estrella (x=${w.P.x})`);
});

test('Mundo 5: quieto dentro de la concha, la luz no te ve; moviéndote, sí', () => {
  const still = new World(4, { rng: seeded() });
  place(still, 1285, 440, 'caracol');
  run(still, 60 * 8);
  assert.equal(still.P.shell, 'caracol');

  const moving = new World(4, { rng: seeded() });
  place(moving, 1285, 440, 'caracol');
  let caught = false;
  for (let f = 0; f < 60 * 8 && !caught; f++) {
    moving.step(ctl({ right: f % 120 < 60, left: f % 120 >= 60 }));
    if (moving.P.shell !== 'caracol' || moving.state !== 'play') caught = true;
  }
  assert.equal(caught, true);
});

test('Mundo 6: el Acaparador cae con 3 lanzamientos y el último exige soltar tu concha', () => {
  const w = new World(5, { rng: seeded(3) });
  w.cpIndex = 5; // la estrella de mar justo antes de la arena
  place(w, 3470, 440, null);
  let lastHit = null;
  let f = 0;
  for (; f < 60 * 120 && w.state !== 'done'; f++) {
    const P = w.P, b = w.boss;
    const c = ctl({});
    if (w.state === 'play' && b.locked) {
      if (!P.shell) {
        const s = w.shells.filter((s2) => s2.solid).sort((x, y) => Math.abs(x.x - P.x) - Math.abs(y.x - P.x))[0];
        if (s) { if (Math.abs(s.x - P.x) > 8) { c.right = s.x > P.x; c.left = s.x < P.x; } else c.act = f % 20 < 2; }
      } else {
        if (P.x < 3700) c.right = true; else if (P.x > 3760) c.left = true;
        if (b.phase === 'eye' && b.eye > 0.7) { if (P.facing < 0) c.right = true; else c.act = f % 30 < 2; }
      }
      // mantener el salto mientras pasa la pinza (un toque corto da un salto bajo)
      if (b.claw && b.claw.go && b.claw.x - P.x < 300 && b.claw.x - P.x > -60) c.jump = true;
      if (b.hp === 1 && b.phase === 'rain') lastHit = 'llovieron conchas en el último golpe';
    }
    w.step(c);
    w.drain();
  }
  assert.equal(lastHit, null, lastHit);
  assert.equal(w.boss.hp, 0);
  assert.equal(w.state, 'done');
  assert.equal(w.P.shell, 'propia', 'al final Pinza recibe una casa propia');
});

test('cada mundo tiene un cierre que termina', () => {
  LEVELS.forEach((L, i) => {
    const w = new World(i, { rng: seeded() });
    w.state = 'play';
    const g = L.goal;
    if (g.type === 'pole') place(w, g.x - 28, g.ground);
    else if (g.type === 'pearl') place(w, g.x - 15, 400);
    else if (g.type === 'mentor') { w.mentor.i = L.mentor.length - 1; const m = L.mentor.at(-1); w.mentor.x = m.x; w.mentor.y = m.y; place(w, m.x - 60, m.y); }
    else { w.boss.locked = true; w.boss.hp = 0; }
    w.startEnding();
    run(w, 60 * 16);
    assert.equal(w.state, 'done', `mundo ${i + 1}`);
    assert.ok(w.drain().some((e) => e.type === 'done'));
  });
});

test('el avance se guarda y solo cambia con un récord', () => {
  const mem = new Map();
  const store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  const p = loadProgress(store);
  assert.deepEqual(p, emptyProgress());
  assert.equal(recordResult(p, { level: 0, pearls: 40, maxPearls: 77 }, store), true);
  assert.equal(recordResult(p, { level: 0, pearls: 30, maxPearls: 77 }, store), false);
  assert.equal(loadProgress(store).best[0].pearls, 40);
  const broken = { getItem: () => '{nope', setItem: () => { throw new Error('lleno'); } };
  assert.deepEqual(loadProgress(broken), emptyProgress());
});
