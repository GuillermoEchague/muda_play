// Preferencias del jugador, guardadas en este navegador.
const KEY = 'muda-prefs';
const DEFAULTS = { sound: true };

export const settings = { ...DEFAULTS };

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === typeof DEFAULTS[k]) settings[k] = saved[k];
} catch { /* sin almacenamiento: se usan los valores por defecto */ }

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* nada que hacer */ }
}

// Un "almacén" seguro para el avance: si localStorage no existe o falla, no rompe el juego.
export const store = {
  getItem(k) { try { return localStorage.getItem(k); } catch { return null; } },
  setItem(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};
