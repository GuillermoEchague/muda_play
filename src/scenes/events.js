import { play, motif } from '../audio/sfx.js';

// Reparte los eventos del core: lo visual a la vista y los sonidos al audio.
export function dispatchEvents(world, view) {
  const out = world.drain();
  for (const e of out) {
    view.handleEvent(e);
    if (e.type === 'sfx') play(e.name, e);
    else if (e.type === 'motif') motif(e.rate, e.minor, e.oct);
  }
  return out;
}
