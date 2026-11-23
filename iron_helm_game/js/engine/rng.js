/**
 * Generador pseudoaleatorio con semilla (mulberry32). Serializable: el estado cabe en un entero,
 * así una partida guardada continúa exactamente igual.
 */
export class RNG {
  constructor(seed = Date.now() >>> 0) {
    this.state = seed >>> 0;
  }
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** entero en [0, n) */
  int(n) { return Math.floor(this.next() * n); }
  /** dado de `sides` caras */
  die(sides = 6) { return this.int(sides) + 1; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  pick(arr) { return arr[this.int(arr.length)]; }
}
