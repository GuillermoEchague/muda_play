// Sonidos sintetizados con Web Audio (sin archivos): efectos, el rumor del mar y el leitmotiv de la concha.
// Para usar audios reales: cárgalos en Boot.js (this.load.audio) y reemplaza play() por this.sound.play(nombre).
import { settings } from '../settings.js';

let AC = null, master = null, fx = null, mus = null, sea = null;

// El celular solo permite sonido después del primer toque: main.js llama a esto en ese momento.
export function unlockAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = settings.sound ? 0.7 : 0; master.connect(AC.destination);
      mus = AC.createGain(); mus.gain.value = 0.32; mus.connect(master);
      fx = AC.createGain(); fx.gain.value = 0.45; fx.connect(master);
      startSea();
    } catch { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
}

// Rumor del mar: ruido marrón filtrado que sube y baja lento.
function startSea() {
  const len = AC.sampleRate * 3, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  let l = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; }
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
  sea = AC.createGain(); sea.gain.value = 0.16;
  const lfo = AC.createOscillator(); lfo.frequency.value = 0.11;
  const lg = AC.createGain(); lg.gain.value = 0.1;
  lfo.connect(lg); lg.connect(sea.gain); src.connect(lp); lp.connect(sea); sea.connect(master);
  src.start(); lfo.start();
}

export function setSound(on) {
  settings.sound = on;
  if (master) master.gain.setTargetAtTime(on ? 0.7 : 0, AC.currentTime, 0.05);
}

function note(f, t0, dur, type = 'sine', vol = 0.2, dest = fx, slide = 0) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
}

const now = () => AC.currentTime + 0.01;

const SFX = {
  jump: () => note(330, now(), 0.16, 'sine', 0.25, fx, 640),
  dj: () => { const t = now(); note(520, t, 0.12, 'triangle', 0.2, fx, 900); note(780, t + 0.06, 0.14, 'sine', 0.15, fx, 1200); },
  drop: () => { const t = now(); note(220, t, 0.25, 'triangle', 0.35, fx, 150); note(440, t + 0.02, 0.12, 'sine', 0.12); },
  pick: () => { const t = now(); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, t + i * 0.055, 0.2, 'triangle', 0.2)); },
  pearl: () => { const t = now(); note(1318.5, t, 0.12, 'sine', 0.12); note(1975.5, t + 0.04, 0.1, 'sine', 0.06); },
  stomp: () => note(260, now(), 0.12, 'square', 0.1, fx, 90),
  hit: () => note(180, now(), 0.3, 'sawtooth', 0.18, fx, 60),
  crack: () => { const t = now(); note(900, t, 0.06, 'square', 0.06, fx, 300); note(500, t + 0.05, 0.08, 'square', 0.05, fx, 200); },
  die: () => { const t = now(); [392, 330, 262, 196].forEach((f, i) => note(f, t + i * 0.11, 0.2, 'triangle', 0.22)); },
  bonk: () => note(150, now(), 0.09, 'square', 0.08),
  cp: () => { const t = now(); [587.33, 880, 1174.66].forEach((f, i) => note(f, t + i * 0.04, 0.5, 'sine', 0.14)); },
  flag: (e) => {
    const t = now(), n = 3 + Math.round((e.r || 0) * 5);
    const sc = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.5, 1479.98];
    for (let i = 0; i < n; i++) note(sc[i], t + i * 0.08, 0.3, 'triangle', 0.2);
  },
  rumble: () => { const t = now(); note(55, t, 2.6, 'sawtooth', 0.22, fx, 32); note(41, t + 0.3, 2.4, 'sine', 0.3); },
  wave: () => { const t = now(); note(120, t, 2.2, 'sawtooth', 0.12, fx, 60); note(80, t + 0.2, 2.4, 'sine', 0.25, fx, 50); },
  throw: () => note(300, now(), 0.22, 'triangle', 0.22, fx, 900),
  bossHit: () => { const t = now(); note(98, t, 0.8, 'sawtooth', 0.22, fx, 49); [587.33, 739.99, 880].forEach((f, i) => note(f, t + 0.05 + i * 0.07, 0.3, 'triangle', 0.16)); },
  alarm: () => { const t = now(); note(1046.5, t, 0.1, 'square', 0.07); note(784, t + 0.11, 0.14, 'square', 0.07); },
  blip: () => note(660, now(), 0.06, 'square', 0.05, fx, 990),
  select: () => { const t = now(); note(520, t, 0.06, 'square', 0.05); note(780, t + 0.06, 0.08, 'square', 0.05); },
};

export function play(name, e = {}) {
  if (!settings.sound || !AC || !SFX[name]) return;
  try { SFX[name](e); } catch { /* el audio no es crítico */ }
}

// Leitmotiv (punto 50 del curso): la melodía de la concha, en re mayor. En el Mundo 4 suena en menor.
export function motif(rate = 1, minor = false, oct = 1) {
  if (!settings.sound || !AC) return;
  try {
    const N = minor
      ? [[587.33, 1], [698.46, 1], [880, 1], [932.33, 2], [880, 1], [698.46, 1], [659.25, 1], [587.33, 3]]
      : [[587.33, 1], [739.99, 1], [880, 1], [987.77, 2], [880, 1], [739.99, 1], [659.25, 1], [587.33, 3]];
    const beat = 0.24 / rate;
    let t = now() + 0.05;
    const t0 = t;
    for (const [f, b] of N) {
      note(f * oct, t, b * beat * 1.7, 'triangle', 0.2, mus);
      note(f * oct / 2, t, b * beat * 1.4, 'sine', 0.06, mus);
      t += b * beat;
    }
    note(146.83 * oct, t0, 6 * beat, 'sine', 0.12, mus);
    note((minor ? 116.54 : 110) * oct, t0 + 6 * beat, 5 * beat, 'sine', 0.12, mus);
  } catch { /* nada */ }
}

// Al pausar o salir se baja el mar para que no siga sonando encima del menú.
export function setSea(level) {
  if (sea && AC) sea.gain.setTargetAtTime(level, AC.currentTime, 0.2);
}
