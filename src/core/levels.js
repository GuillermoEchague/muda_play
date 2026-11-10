// Los seis mundos de Muda como datos. El core los lee; la vista usa `pal`, `bg` y `mount` para dibujar.
// Coordenadas en píxeles del juego (960 x 540 por pantalla). y crece hacia abajo.
//
// solids: suelo ('sand'), roca ('rock'), piedra ('stone'), madera a la deriva ('drift', se mueve),
//         conchas rotas ('crumble', se deshacen al pisarlas) y el cuerpo del jefe ('boss').
// cps: estrellas de mar (puntos de control). homes: dónde reaparece una concha que cae al agua.
// fresh: conchas nuevas que brillan. hint: pared con pista fantasma. goal: boya, perla, mentora o jefe.

function pearlMaker(fn) {
  return () => {
    const P = [];
    const line = (x1, x2, y, n) => { for (let i = 0; i < n; i++) P.push({ x: n === 1 ? x1 : x1 + (x2 - x1) * i / (n - 1), y, taken: false }); };
    const arc = (x1, y1, x2, y2, h, n) => { for (let i = 0; i < n; i++) { const t = i / (n - 1); P.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t - h * 4 * t * (1 - t), taken: false }); } };
    fn(line, arc);
    return P;
  };
}
export const ROCKWALL = x => ({ x, y: -1000, w: 200, h: 1600, k: 'rock' });
const urchinRow = (x0, n, y) => Array.from({ length: n }, (_, i) => ({ t: 'urchin', x: x0 + i * 40, y }));

export const LEVELS = [
  {
    n: 1, name: 'La playa', world: 5800, bg: 'beach', water: 474,
    pal: { skyA: ['#8FD3E0', '#7FB2CF'], skyB: ['#FCE8CB', '#F8C9A4'], gTop: '#F2D49C', gBot: '#D8AF6E', lip: '#FBEBC8', dot: 'rgba(176,132,72,.45)', rock: '#6F8895', stone: '#A3B1B5', dune: '#F5E2B9', sea: ['#58AFC0', '#4D8FAE'] },
    mount: { x: 770, base: 0.55, span: 0.45 },
    solids: [
      ROCKWALL(-200),
      { x: 0, y: 440, w: 1100, h: 160, k: 'sand' },
      { x: 370, y: 380, w: 60, h: 60, k: 'stone' },
      { x: 1100, y: 322, w: 500, h: 278, k: 'sand' },
      { x: 1820, y: 322, w: 180, h: 278, k: 'sand' },
      { x: 2060, y: 250, w: 200, h: 350, k: 'sand' },
      { x: 2260, y: 322, w: 1140, h: 278, k: 'sand' },
      { x: 2700, y: -1000, w: 200, h: 1294, k: 'rock' },
      { x: 3800, y: 360, w: 500, h: 240, k: 'sand' },
      { x: 4380, y: 300, w: 120, h: 300, k: 'sand' },
      { x: 4560, y: 240, w: 140, h: 360, k: 'sand' },
      { x: 4760, y: 300, w: 240, h: 300, k: 'sand' },
      { x: 5000, y: 380, w: 800, h: 220, k: 'sand' },
      { x: 5440, y: 330, w: 50, h: 50, k: 'stone' },
      ROCKWALL(5800)
    ],
    glyphs: [{ x: 150, top: 440, k: 'move' }, { x: 300, top: 440, k: 'jump' }, { x: 990, top: 440, k: 'drop' }, { x: 1480, top: 322, k: 'double' }, { x: 2610, top: 322, k: 'drop' }, { x: 3330, top: 322, k: 'glide' }],
    cps: [{ x: 80, y: 440 }, { x: 1250, y: 322 }, { x: 2580, y: 322 }, { x: 2990, y: 322 }, { x: 3860, y: 360 }, { x: 5060, y: 380 }],
    homes: { infancia: { x: 220, y: 410 }, espiral: { x: 1200, y: 292 }, caracol: { x: 3070, y: 292 } },
    startShell: 'infancia', intro: true,
    fresh: [{ type: 'espiral', x: 1200, y: 292 }, { type: 'caracol', x: 3070, y: 292 }],
    enemies: [
      { t: 'flea', x: 1900, y: 302, min: 1830, max: 1990 },
      { t: 'gull', x: 2150, y: 180, min: 2080, max: 2420, amp: 28 },
      { t: 'urchin', x: 2420, y: 300 }, { t: 'urchin', x: 2520, y: 300 },
      { t: 'flea', x: 3950, y: 340, min: 3880, max: 4280 },
      { t: 'flea', x: 4150, y: 340, min: 3880, max: 4280 },
      { t: 'urchin', x: 4880, y: 278 },
      { t: 'flea', x: 5200, y: 360, min: 5060, max: 5420 },
      { t: 'gull', x: 5150, y: 290, min: 5060, max: 5300, amp: 30 },
      { t: 'gull', x: 5380, y: 250, min: 5280, max: 5480, amp: 26 }
    ],
    pearls: pearlMaker((line, arc) => {
      line(150, 270, 415, 4); arc(325, 415, 475, 415, 70, 5); arc(1130, 300, 1330, 300, 40, 4); arc(1590, 290, 1830, 290, 110, 7);
      arc(2005, 300, 2075, 225, 25, 3); line(2100, 2220, 225, 4); line(2730, 2870, 308, 5); arc(3420, 290, 3790, 335, 50, 11);
      arc(3950, 335, 4150, 335, 60, 4); arc(4320, 330, 4400, 272, 30, 3); arc(4510, 272, 4580, 212, 30, 3); line(4600, 4680, 212, 3);
      arc(4710, 212, 4790, 272, 20, 3); arc(5100, 355, 5300, 355, 80, 5); arc(5450, 300, 5540, 250, 40, 3);
    }),
    deco: 'pool',
    hint: { wall: 1100, ground: 440, top: 322, shell: 'infancia', wear: null, dj: false },
    goal: { type: 'pole', x: 5554, y: 150, h: 230, ground: 380 },
    ending: 'w1', music: { rate: 1 },
    endText: 'La marea se retiró y algo enorme despertó en la costa.'
  },
  {
    n: 2, name: 'Las rocas', world: 5200, bg: 'rocks', water: 474,
    pal: { skyA: ['#9CC6DD', '#8AA8CC'], skyB: ['#F7D7B4', '#F0B48E'], gTop: '#CFC6B4', gBot: '#8E8676', lip: '#9DBF8A', dot: 'rgba(90,80,66,.4)', rock: '#5F7682', stone: '#9AA6AA', dune: '#B9C2C4', sea: ['#4FA2B8', '#3F7FA2'] },
    mount: { x: 760, base: 0.85, span: 0.3 },
    solids: [
      ROCKWALL(-200),
      { x: 0, y: 440, w: 1700, h: 160, k: 'sand' },
      { x: 960, y: -1000, w: 380, h: 1370, k: 'rock' },
      { x: 1780, y: 420, w: 100, h: 18, k: 'drift', mv: { ax: 'x', amp: 70, p: 3.2 } },
      { x: 2010, y: 380, w: 100, h: 18, k: 'drift', mv: { ax: 'y', amp: 40, p: 2.6 } },
      { x: 2250, y: 440, w: 750, h: 160, k: 'sand' },
      { x: 3000, y: 240, w: 500, h: 360, k: 'sand' },
      { x: 3720, y: 240, w: 230, h: 360, k: 'sand' },
      { x: 3950, y: 320, w: 350, h: 280, k: 'sand' },
      { x: 4380, y: 280, w: 120, h: 320, k: 'sand' },
      { x: 4500, y: 380, w: 700, h: 220, k: 'sand' },
      { x: 4880, y: 330, w: 50, h: 50, k: 'stone' },
      ROCKWALL(5200)
    ],
    glyphs: [{ x: 790, top: 440, k: 'swap' }, { x: 2900, top: 440, k: 'step' }],
    cps: [{ x: 80, y: 440 }, { x: 1400, y: 440 }, { x: 2300, y: 440 }, { x: 3100, y: 240 }, { x: 3760, y: 240 }, { x: 4540, y: 380 }],
    homes: { caracol: { x: 700, y: 410 }, erizo: { x: 2700, y: 410 }, espiral: { x: 2800, y: 410 } },
    startShell: 'caracol',
    fresh: [{ type: 'erizo', x: 880, y: 410 }, { type: 'espiral', x: 2800, y: 410 }],
    enemies: [
      ...urchinRow(1000, 8, 418),
      { t: 'gull', x: 1900, y: 300, min: 1750, max: 2200, amp: 30 },
      { t: 'flea', x: 2350, y: 420, min: 2300, max: 2600 },
      { t: 'flea', x: 4050, y: 300, min: 3960, max: 4290 },
      { t: 'urchin', x: 4650, y: 358 },
      { t: 'gull', x: 4600, y: 300, min: 4550, max: 4800, amp: 28 },
      { t: 'gull', x: 4850, y: 260, min: 4780, max: 4980, amp: 24 }
    ],
    pearls: pearlMaker((line, arc) => {
      line(100, 250, 415, 4); line(1010, 1290, 405, 6); arc(1700, 400, 1790, 390, 40, 3); arc(1880, 380, 2020, 350, 50, 3);
      arc(2120, 340, 2260, 410, 40, 3); arc(2960, 380, 3060, 210, 60, 4); arc(3480, 210, 3740, 210, 120, 7); line(3780, 3920, 210, 4);
      arc(3960, 290, 4200, 290, 60, 5); arc(4290, 300, 4400, 250, 30, 3); arc(4520, 350, 4760, 350, 80, 5); arc(4880, 300, 4980, 240, 40, 3);
    }),
    hint: { wall: 3000, ground: 440, top: 240, shell: 'erizo', wear: 'espiral', dj: true },
    goal: { type: 'pole', x: 4994, y: 150, h: 230, ground: 380 },
    ending: 'w2', music: { rate: 1.05 },
    endText: 'La marea subió de golpe y la corriente te arrastró mar adentro, hacia Las profundidades.'
  },
  {
    n: 3, name: 'Las profundidades', world: 4700, bg: 'deep', water: null, dark: true,
    phys: { grav: 1100, jump: 470, maxf: 380, glide: 50, run: 230 },
    pal: { gTop: '#3E6E78', gBot: '#1B3843', lip: '#6FA2A6', dot: 'rgba(150,210,210,.22)', rock: '#284452', stone: '#4B6A74' },
    solids: [
      ROCKWALL(-200),
      { x: 0, y: 420, w: 1800, h: 180, k: 'sand' },
      { x: 1800, y: 160, w: 500, h: 440, k: 'sand' },
      { x: 2840, y: 400, w: 1160, h: 200, k: 'sand' },
      { x: 3560, y: -1000, w: 360, h: 1330, k: 'rock' },
      { x: 4000, y: 400, w: 700, h: 200, k: 'sand' },
      ROCKWALL(4700)
    ],
    zones: [
      { x: 900, y: -100, w: 600, h: 740, fx: -150 },
      { x: 1700, y: 50, w: 80, h: 370, fy: -2600 },
      { x: 2300, y: -100, w: 540, h: 740, fx: 170 }
    ],
    glyphs: [],
    cps: [{ x: 80, y: 420 }, { x: 1620, y: 420 }, { x: 1900, y: 160 }, { x: 2900, y: 400 }, { x: 3960, y: 400 }],
    homes: { espiral: { x: 1900, y: 130 }, erizo: { x: 3480, y: 370 } },
    startShell: 'espiral',
    fresh: [{ type: 'erizo', x: 3480, y: 370 }],
    enemies: [
      { t: 'jelly', x: 1100, y1: 300, y2: 392 }, { t: 'jelly', x: 1350, y1: 280, y2: 390 },
      { t: 'jelly', x: 3100, y1: 270, y2: 370 }, { t: 'jelly', x: 3260, y1: 250, y2: 360 },
      ...urchinRow(3600, 8, 378),
      { t: 'jelly', x: 4150, y1: 280, y2: 370 }
    ],
    pearls: pearlMaker((line, arc) => {
      line(120, 300, 395, 4); line(920, 1460, 395, 7); arc(1740, 380, 1740, 90, 0, 6); arc(1850, 130, 2250, 130, 30, 5);
      arc(2320, 110, 2820, 370, 120, 9); line(3600, 3880, 362, 6); arc(4050, 370, 4350, 370, 70, 5);
    }),
    goal: { type: 'pearl', x: 4450, y: 372 },
    ending: 'w3', music: { rate: 0.8, oct: 0.5 },
    endText: 'En la cueva más honda, el Acaparador te arrancó la concha. Ahora estás sin casa.'
  },
  {
    n: 4, name: 'Sin conchas', world: 4900, bg: 'dusk', water: 480,
    pal: { skyA: ['#6E6A9C', '#3A3866'], skyB: ['#F2A483', '#C2707A'], gTop: '#A8957E', gBot: '#5E5244', lip: '#C9B9A0', dot: 'rgba(70,58,44,.4)', rock: '#4D5468', stone: '#8A8597', dune: '#8C7E86', sea: ['#5A6E9A', '#3A4A74'] },
    mount: { x: 740, base: 1.05, span: 0.25 },
    solids: [
      ROCKWALL(-200),
      { x: 0, y: 440, w: 700, h: 160, k: 'sand' },
      { x: 760, y: 420, w: 80, h: 16, k: 'crumble' },
      { x: 900, y: 390, w: 80, h: 16, k: 'crumble' },
      { x: 1040, y: 360, w: 80, h: 16, k: 'crumble' },
      { x: 1180, y: 390, w: 80, h: 16, k: 'crumble' },
      { x: 1320, y: 440, w: 780, h: 160, k: 'sand' },
      { x: 2150, y: 380, w: 100, h: 220, k: 'sand' },
      { x: 2300, y: 320, w: 100, h: 16, k: 'crumble' },
      { x: 2450, y: 300, w: 250, h: 300, k: 'sand' },
      { x: 2760, y: 320, w: 90, h: 18, k: 'drift', mv: { ax: 'x', amp: 60, p: 3 } },
      { x: 3000, y: 300, w: 90, h: 18, k: 'drift', mv: { ax: 'y', amp: 45, p: 2.6 } },
      { x: 3220, y: 320, w: 80, h: 16, k: 'crumble' },
      { x: 3380, y: 360, w: 1520, h: 240, k: 'sand' },
      ROCKWALL(4900)
    ],
    glyphs: [],
    cps: [{ x: 80, y: 440 }, { x: 1340, y: 440 }, { x: 2480, y: 300 }, { x: 3400, y: 360 }, { x: 4250, y: 360 }],
    homes: {},
    startShell: null,
    fresh: [],
    enemies: [
      { t: 'flea', x: 1500, y: 420, min: 1450, max: 1700 },
      { t: 'flea', x: 1850, y: 420, min: 1750, max: 2050 },
      { t: 'gull', x: 2400, y: 230, min: 2350, max: 2650, amp: 25 },
      { t: 'flea', x: 3600, y: 340, min: 3500, max: 3800 },
      { t: 'flea', x: 4100, y: 340, min: 3900, max: 4200 },
      { t: 'urchin', x: 4000, y: 338 },
      { t: 'gull', x: 4200, y: 260, min: 4100, max: 4400, amp: 28 }
    ],
    pearls: pearlMaker((line, arc) => {
      line(100, 300, 415, 4); arc(700, 380, 1300, 380, 50, 9); arc(1450, 400, 1650, 400, 70, 5); arc(2100, 400, 2460, 270, 60, 6);
      line(2480, 2680, 275, 4); arc(2720, 290, 3380, 330, 60, 10); arc(3500, 330, 3700, 330, 70, 5); arc(3990, 320, 4060, 320, 60, 3); line(4300, 4500, 335, 4);
    }),
    mentor: [{ x: 330, y: 440 }, { x: 650, y: 440 }, { x: 1380, y: 440, hop: 1 }, { x: 2060, y: 440 }, { x: 2560, y: 300, hop: 1 }, { x: 3440, y: 360, hop: 1 }, { x: 4600, y: 360 }],
    goal: { type: 'mentor' },
    ending: 'w4', music: { rate: 0.9, minor: true },
    endText: 'La mentora te enseñó a moverte sin casa. Sigue en el Mundo 5: La noche oscura.'
  },
  {
    n: 5, name: 'La noche oscura', world: 4800, bg: 'night', water: 480, night: true,
    pal: { skyA: ['#1C2246', '#141938'], skyB: ['#3A3E6C', '#2C3060'], gTop: '#86829A', gBot: '#3D3A50', lip: '#B2AFC6', dot: 'rgba(20,18,40,.4)', rock: '#3B4157', stone: '#6E7088', dune: '#2E3253', sea: ['#27365F', '#1D294C'] },
    mount: { x: 780, base: 1.15, span: 0.25 },
    solids: [
      ROCKWALL(-200),
      { x: 0, y: 440, w: 2000, h: 160, k: 'sand' },
      { x: 2060, y: 420, w: 80, h: 16, k: 'crumble' },
      { x: 2200, y: 400, w: 100, h: 18, k: 'drift', mv: { ax: 'x', amp: 60, p: 3 } },
      { x: 2400, y: 410, w: 80, h: 16, k: 'crumble' },
      { x: 2560, y: 440, w: 740, h: 160, k: 'sand' },
      { x: 3300, y: 322, w: 700, h: 278, k: 'sand' },
      { x: 4220, y: 322, w: 580, h: 278, k: 'sand' },
      ROCKWALL(4800)
    ],
    lights: [{ x: 1300, half: 0.45, p: 6, ph: 0 }, { x: 2900, half: 0.4, p: 5, ph: 0 }, { x: 3250, half: 0.4, p: 5, ph: Math.PI }, { x: 4050, half: 0.5, p: 4.2, ph: 1 }],
    glyphs: [{ x: 820, top: 440, k: 'hide' }, { x: 3190, top: 440, k: 'step' }],
    cps: [{ x: 80, y: 440 }, { x: 1750, y: 440 }, { x: 2600, y: 440 }, { x: 3360, y: 322 }, { x: 4260, y: 322 }],
    homes: { caracol: { x: 320, y: 410 }, erizo: { x: 2700, y: 410 }, espiral: { x: 3420, y: 292 } },
    startShell: null,
    fresh: [{ type: 'caracol', x: 320, y: 410 }, { type: 'erizo', x: 2700, y: 410 }, { type: 'espiral', x: 3420, y: 292 }],
    enemies: [
      { t: 'flea', x: 600, y: 420, min: 550, max: 780 },
      { t: 'gull', x: 2250, y: 300, min: 2150, max: 2450, amp: 28 },
      { t: 'flea', x: 2750, y: 420, min: 2620, max: 3000 },
      { t: 'flea', x: 4400, y: 302, min: 4300, max: 4560 }
    ],
    pearls: pearlMaker((line, arc) => {
      line(120, 300, 415, 4); line(1000, 1600, 415, 7); arc(2000, 400, 2560, 400, 60, 9); line(2650, 3150, 415, 6);
      arc(3240, 400, 3340, 300, 40, 3); line(3500, 3950, 300, 5); arc(3990, 300, 4230, 300, 110, 7); line(4300, 4500, 300, 4);
    }),
    hint: { wall: 3300, ground: 440, top: 322, shell: 'caracol', wear: null, dj: false },
    goal: { type: 'pole', x: 4600, y: 92, h: 230, ground: 322 },
    ending: 'w5', music: { rate: 0.85, oct: 0.5 },
    endText: 'Al amanecer, Pinza entendió que la montaña era un montón de casas que nadie soltó. Sigue en el Mundo 6: La montaña.'
  },
  {
    n: 6, name: 'La montaña', world: 4360, bg: 'dawn', water: null,
    pal: { skyA: ['#7FA3D4', '#8DB4DE'], skyB: ['#FBD3A8', '#FCE2C0'], gTop: '#DCC6DA', gBot: '#9C86A6', lip: '#F4E9F2', dot: 'rgba(90,60,100,.35)', rock: '#5E5276', stone: '#A898B4', dune: '#C7B4D0', sea: ['#5FA7C4', '#6FB6CF'] },
    solids: [
      ROCKWALL(-200),
      { x: 0, y: 440, w: 500, h: 160, k: 'sand' },
      { x: 500, y: 380, w: 200, h: 220, k: 'sand' },
      { x: 760, y: 320, w: 140, h: 280, k: 'sand' },
      { x: 960, y: 260, w: 140, h: 340, k: 'sand' },
      { x: 1160, y: 300, w: 340, h: 300, k: 'sand' },
      { x: 1720, y: 300, w: 230, h: 300, k: 'sand' },
      { x: 1950, y: 240, w: 650, h: 360, k: 'sand' },
      { x: 2060, y: -1000, w: 380, h: 1170, k: 'rock' },
      { x: 2950, y: 280, w: 450, h: 320, k: 'sand' },
      { x: 3400, y: 440, w: 960, h: 160, k: 'sand' },
      { x: 4130, y: -1000, w: 300, h: 1600, k: 'boss' }
    ],
    glyphs: [{ x: 3540, top: 440, k: 'throw' }],
    cps: [{ x: 80, y: 440 }, { x: 1200, y: 300 }, { x: 1990, y: 240 }, { x: 2480, y: 240 }, { x: 2980, y: 280 }, { x: 3470, y: 440 }],
    homes: { espiral: { x: 1180, y: 270 }, erizo: { x: 1990, y: 210 }, caracol: { x: 2520, y: 210 } },
    startShell: null,
    fresh: [{ type: 'espiral', x: 200, y: 410 }, { type: 'erizo', x: 1990, y: 210 }, { type: 'caracol', x: 2520, y: 210 }],
    enemies: [
      { t: 'flea', x: 1250, y: 280, min: 1180, max: 1480 },
      { t: 'gull', x: 1600, y: 230, min: 1510, max: 1720, amp: 26 },
      ...urchinRow(2100, 8, 218),
      { t: 'flea', x: 3100, y: 260, min: 3000, max: 3380 }
    ],
    pearls: pearlMaker((line, arc) => {
      line(100, 400, 415, 4); arc(520, 350, 780, 290, 40, 4); arc(800, 290, 1000, 230, 40, 4); arc(1180, 270, 1460, 270, 50, 4);
      arc(1490, 270, 1730, 270, 110, 7); line(1760, 1920, 270, 4); line(2110, 2390, 212, 6); arc(2600, 205, 2950, 250, 50, 9); arc(3000, 250, 3300, 250, 60, 5);
    }),
    boss: { arena: 3400, gate: 3360, eye: { x: 4136, y: 250 } },
    goal: { type: 'boss' },
    ending: 'w6', music: { rate: 1.15 },
    endText: 'Pinza dejó de cargar casas ajenas. Las conchas liberadas encontraron dueño, y Pinza encontró una casa propia.'
  }
];
