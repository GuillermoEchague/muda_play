// Avance guardado: mundos completados y mejor resultado de cada uno.
// Recibe un "almacén" con getItem/setItem para poder probarlo sin navegador.
import { LEVELS } from './levels.js';

const KEY = 'muda-progress';

export function emptyProgress() {
  return { best: LEVELS.map(() => null) };
}

export function loadProgress(store) {
  const p = emptyProgress();
  try {
    const saved = JSON.parse(store.getItem(KEY) || '{}');
    if (Array.isArray(saved.best)) {
      saved.best.forEach((b, i) => {
        if (i < p.best.length && b && Number.isFinite(b.pearls)) p.best[i] = { pearls: b.pearls, max: b.max | 0 };
      });
    }
  } catch { /* sin almacenamiento o datos dañados: se empieza de cero */ }
  return p;
}

// Guarda el resultado si es mejor que el anterior. Devuelve true si fue récord.
export function recordResult(progress, summary, store) {
  const prev = progress.best[summary.level];
  const record = !prev || summary.pearls > prev.pearls;
  if (record) progress.best[summary.level] = { pearls: summary.pearls, max: summary.maxPearls };
  try { store.setItem(KEY, JSON.stringify(progress)); } catch { /* sin almacenamiento */ }
  return record;
}

export const completedCount = (progress) => progress.best.filter(Boolean).length;
