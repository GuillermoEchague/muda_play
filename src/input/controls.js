// Los controles de un cuadro. Teclado, control y botones táctiles entregan este mismo objeto.
export const blank = () => ({ left: false, right: false, jump: false, act: false });

export function merge(into, from) {
  if (!from) return into;
  for (const k in into) into[k] = into[k] || !!from[k];
  return into;
}
