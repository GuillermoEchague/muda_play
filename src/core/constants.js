// Medidas y reglas del mundo (en píxeles del juego, no de la pantalla).
export const W = 960;
export const H = 540;

// La lógica avanza a 60 cuadros por segundo. Cada cuadro se divide en 2 subpasos porque la
// física se ajustó a 120 Hz en el prototipo: así los saltos miden exactamente lo mismo.
export const FPS = 60;
export const STEP_MS = 1000 / FPS;
export const SUB = 2;
export const DT = 1 / (FPS * SUB);

// Física en tierra. Bajo el agua (Mundo 3) cada nivel puede traer la suya.
export const DEF_PHYS = { grav: 1800, jump: 600, maxf: 900, glide: 85, run: 250 };
export const ACC = 1900; // aceleración en el suelo
export const FRIC = 2200; // frenado en el suelo
export const AIR = 1300; // control en el aire

export const COYOTE = 0.1; // segundos para saltar después de dejar el borde
export const JUMP_BUFFER = 0.13; // segundos que se recuerda un salto apretado antes de tocar el suelo
export const HINT_DELAY = 5; // segundos atascado frente a una pared antes de ver la pista fantasma
export const MOTIF_EVERY = 13; // cada cuántos segundos vuelve el leitmotiv

// Tamaños del cangrejo: con concha es más alto.
export const CRAB_W = 30;
export const CRAB_H_SHELL = 36;
export const CRAB_H_NAKED = 22;
export const SHELL_SIZE = 30;
