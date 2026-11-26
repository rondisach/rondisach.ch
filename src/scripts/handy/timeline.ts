// Zeitplan des Handy-Einstiegs (eigene Datei, damit die Seite ihn kennt, ohne Three.js zu laden).
// Fortschritt 0..INTRO: Pizza steigt auf · INTRO..END: Sorten nacheinander · END..1: Stücke fliegen weg.
export const INTRO = 0.1;
export const END = 0.86;

/** Welche Sorte bei Fortschritt p gezeigt wird: Wechsel genau in der Mitte des Wendens. */
export function sorteAt(p: number, n: number) {
  const len = (END - INTRO) / n;
  let k = 0;
  for (let j = 1; j < n; j++) if (p >= INTRO + j * len) k = j;
  return k;
}
