/**
 * Sonido procedural con Web Audio: nada que descargar, latencia cero.
 * Cartas que se deslizan, volteos, dados sobre fieltro, espadazos, monedas, pociones, campanas…
 */
class Sound {
  constructor() { this.ctx = null; this.master = null; this.muted = false; this.vol = 0.7; }
  _init() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.vol; this.master.connect(this.ctx.destination);
      this.noiseBuf = this._noise(1.5);
    } catch { return false; }
    return true;
  }
  /** debe llamarse tras un gesto del usuario */
  unlock() { if (this._init() && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) this.ctx.resume().catch(() => {}); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : this.vol; }
  _noise(sec) { const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  _ok() { return !this.muted && this._init() && this.ctx.state !== 'closed'; }
  _env(g, t, a, peak, d) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  tone(freq, dur = 0.2, { type = 'sine', vol = 0.25, slide = 0, delay = 0, a = 0.005 } = {}) {
    if (!this._ok()) return; const c = this.ctx; const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    this._env(g, t, a, vol, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur = 0.1, { vol = 0.3, freq = 2000, q = 1, type = 'bandpass', delay = 0, slide = 0 } = {}) {
    if (!this._ok()) return; const c = this.ctx; const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur); f.Q.value = q;
    const g = c.createGain(); this._env(g, t, 0.004, vol, dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // --- efectos del juego ---
  deal() { this.noise(0.13, { freq: 3200, q: 0.8, vol: 0.28, slide: -1500 }); this.noise(0.06, { freq: 900, vol: 0.18, delay: 0.09, type: 'lowpass' }); }
  flip() { this.noise(0.07, { freq: 4200, q: 1.5, vol: 0.3 }); this.noise(0.12, { freq: 1500, q: 1, vol: 0.2, delay: 0.05, slide: -800 }); }
  slide() { this.noise(0.18, { freq: 2400, q: 0.7, vol: 0.2, slide: -1200 }); }
  tap() { this.tone(520, 0.05, { type: 'triangle', vol: 0.12 }); }
  click() { this.tone(330, 0.07, { type: 'square', vol: 0.06 }); this.tone(660, 0.05, { type: 'triangle', vol: 0.1, delay: 0.02 }); }
  diceRoll(n = 2) { for (let i = 0; i < 9 + n * 2; i++) this.noise(0.045, { freq: 600 + Math.random() * 1800, q: 4, vol: 0.2 * (1 - i / (14 + n * 2)) + 0.05, delay: i * 0.055 + Math.random() * 0.03 }); }
  diceLand() { this.noise(0.08, { freq: 700, q: 3, vol: 0.28 }); this.tone(180, 0.09, { type: 'triangle', vol: 0.12 }); }
  sword() { this.noise(0.22, { freq: 5500, q: 1.2, vol: 0.38, slide: -3800 }); this.tone(190, 0.12, { type: 'sawtooth', vol: 0.12, slide: -110, delay: 0.14 }); }
  hit() { this.noise(0.14, { freq: 280, q: 0.8, vol: 0.5, type: 'lowpass' }); this.tone(95, 0.2, { type: 'sine', vol: 0.4, slide: -50 }); }
  hurt() { this.hit(); this.tone(140, 0.3, { type: 'sawtooth', vol: 0.12, slide: -60, delay: 0.05 }); }
  miss() { this.noise(0.18, { freq: 1800, q: 1, vol: 0.2, slide: -1200 }); }
  coin() { this.tone(1318, 0.12, { type: 'triangle', vol: 0.18 }); this.tone(1760, 0.22, { type: 'triangle', vol: 0.16, delay: 0.07 }); }
  token() { this.tone(760, 0.06, { type: 'triangle', vol: 0.14 }); this.noise(0.04, { freq: 3000, vol: 0.1 }); }
  potion() { this.noise(0.28, { freq: 900, q: 2, vol: 0.2, slide: 1200 }); this.tone(560, 0.1, { vol: 0.12, delay: 0.1 }); this.tone(820, 0.14, { vol: 0.1, delay: 0.16 }); }
  heal() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, { type: 'sine', vol: 0.15, delay: i * 0.07 })); }
  poison() { this.tone(160, 0.35, { type: 'sawtooth', vol: 0.13, slide: -60 }); this.noise(0.3, { freq: 600, q: 4, vol: 0.12, slide: -400 }); }
  bless() { [880, 1108, 1318, 1760].forEach((f, i) => this.tone(f, 0.6, { type: 'sine', vol: 0.1, delay: i * 0.09 })); }
  gong() { this.tone(98, 1.6, { type: 'sine', vol: 0.4 }); this.tone(196, 1.2, { type: 'sine', vol: 0.18 }); this.tone(294, 0.9, { type: 'triangle', vol: 0.1 }); this.noise(0.5, { freq: 700, q: 2, vol: 0.12 }); }
  victory() { [392, 494, 587, 784, 988, 784, 988, 1175].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.17, delay: i * 0.17 })); }
  defeat() { [220, 196, 165, 131].forEach((f, i) => this.tone(f, 0.9, { type: 'sawtooth', vol: 0.13, delay: i * 0.3 })); }
  level() { [262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.15, delay: i * 0.11 })); }
  eye() { this.tone(70, 0.9, { type: 'sine', vol: 0.4, slide: 25 }); this.tone(1200, 0.5, { type: 'sine', vol: 0.05, slide: -600 }); }
  error() { this.tone(150, 0.18, { type: 'square', vol: 0.12 }); }
  equip() { this.noise(0.1, { freq: 1200, q: 3, vol: 0.28 }); this.tone(300, 0.07, { type: 'square', vol: 0.06 }); }
  page() { this.noise(0.22, { freq: 2600, q: 0.6, vol: 0.18, slide: -1200 }); }
}
export const sound = new Sound();
